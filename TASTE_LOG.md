# Taste log — Test 2 fractals, batch 1

Branch `cursor/test2-fractals-2891`, commit `2fc8d81`. Used like a student on a local server in headless Chrome: Test 1 home, the switch, Test 2 home, topics J1 J2 N1 N2, Julia (presets, drag c, escape radius), Newton (degree chips, presets, drag a root, drag the guess), the footer colour key, a 390px-wide window, a return to Test 1 `#addresses`, and a reload on `#julia`. No console errors. No horizontal scroll at 390px.

## Verdict

The thing we are trying to be able to do is already here: choose Test 2, drag c, watch the filled Julia set stop being a disk, then drag a Newton root and watch its colour move. Those two gestures match the spare voice of Test 1. Everything stacked around them — four topics that open two pages, a second empty plane, escape and step sliders, a "two roots" chip that is not z² − 1, and a footer colour key that still means Cartesian and polar — is a demo bolted onto a study map. Another batch is worth doing only as a cutting batch. After that, stop. No Mandelbrot.

## What clicks

The switch is a real door. Test 1 still lists its 21 places and no Julia. Test 2 lists The Map, Julia, Newton. The footer sentence changes with the map. `#julia` remembers Test 2 across a reload. `#addresses` is still Test 1.

Julia at c = 0 is a blue disk. The green walk from 0.45 + 0.2i stays inside, and the readout says so. Dragging the orange c to about 0.54 + 0.31i changes the picture and the readout: the walk leaves on step 4. That is the lesson, and the sentence on the page is in the Test 1 voice: square, then slide, the solid region is who stays.

Newton opens on the three basins of the cube roots of 1. The readout says `expanded: z^3 - 1`, and the guess 0.35 + 0.45i reaches the purple root in 5 steps. Dragging the blue root breaks the three-way symmetry and the blue region follows it. The green walk is drawn on the picture. This page is closer to Test 1 than Julia is, because the thing you drag sits on the picture you are reading.

The lede on Test 2 home is the right length: two pictures, a point is a place you can start, drag the rule and the colours move.

## What confuses

**Home says the same thing three times.** "Pick a topic" offers J1, J2, N1, N2. "The map" offers the same two places, with the same four chips again. "A short way through" tells you to open those two places. The three-line plan is the page. The other two blocks are a syllabus glued on top. The heading says "The map" and the tab still says "The Map", while the heading on the page says "Test 2".

**A topic does not teach a different picture.** J1 and J2 are the Julia page with a different callout. N1 and N2 are the Newton page with a different callout. The callout repeats the lede. A student who came to learn "the slide c" still meets the whole instrument panel.

**Julia has two pictures, and one of them is empty.** On a wide window the set and "The slide c" sit side by side at the same height. The c plane is a full Re/Im grid with one orange dot. It looks like a second fractal that failed to draw. Under it, the same number can also be typed and picked from a chip. Three controls for one complex number.

**"rabbit" does not stay chosen.** The chip is the one word on the page that is not in the Test 1 voice. Clicking it writes c = −0.12 + 0.75i (the stored example is −0.123 + 0.745i, then rounded) and no chip shows pressed, including rabbit. The picture does change. The control does not admit it.

**"How far we look" teaches a different lesson.** Raising the escape radius from 2 to 6, with c still near 0.54 + 0.31i, moves the walk from "left on step 4" to "left on step 5" and grows the dashed circle. The solid region is the same idea. The paragraph under the slider explains why the radius sometimes secretly becomes |c|. A student who came to see c move the set is now tuning the ruler.

**"Two roots" is not z² − 1.** From the cube roots, that chip hides the purple root and keeps the orange one at −0.5 + 0.866i. The formula becomes (z − 1)(z − (−0.5 + 0.866i)). The readout says a coefficient is not real. No example chip lights. The basins turn into a blue and orange swirl that does not have a name a student can say. The chip labelled z² − 1, one row below, is the polynomial they meant. The degree chips and the example chips are the same decision drawn twice, and they disagree.

**The formula hides the polynomial you know.** At the default Newton picture the display math is the product with 0.866, not z³ − 1. The name z³ − 1 is a line in the monospace readout. When a root moves off the real-coefficient cases, that line gives up and says the product is the polynomial. The picture is doing the teaching. The formula is doing paperwork.

**The footer colour key contradicts the pictures.** Opened on the Julia page, it still says blue is the Cartesian address, orange is the polar address, purple is the output in the w-plane, and the menu marks are T1, T2, and T3. On this map blue is "stayed", orange is "escaped" or a root, purple is a root, and the menu mark is F1, which the key never names. Each station then repeats a longer key of its own. Green, at least, still means "the point you drag" on both maps.

**F1 is a costume.** One thread, two stops, a badge, and a purple disc in the menu. Test 1's threads earn their badges because three of them cross twenty places. Here the badge names an idea the lede already said.

## Test 1's taste, and what was bolted on

Test 1 puts one dot on one plane and a sentence that checks itself. The home page is a finder, that dot, and a map of many places, because Test 1 has many places.

Test 2's sentences are in that voice. The pages are not. They are built like a small exhibit: topic chips, a duplicate list, a plan, a rule panel, a picture, a second picture, sliders, a colour key. The exhibit is protecting the pictures with explanation. The pictures already explain themselves when c or a root moves.

## Cut

- The topic row on Test 2 home, and the topic callout on Julia and Newton, until a topic changes what is on the page.
- The second copy of the two places (keep one list).
- The F1 badge and the menu dot that goes with it.
- Julia's second full plane. Keep one way to drag c, drawn as a control beside one picture.
- Julia's step slider and escape-radius slider, and the paragraph that justifies the radius.
- The rabbit chip, unless it can keep its value and look selected. c = 0, c = −0.75, and c = i already say the three shapes: disk, pinched, almost no inside.
- Newton's "Two roots" / "Three roots" chips.
- Newton's "steps before we give up" slider.
- The long in-page colour keys. Three lines are enough: stayed or which root, escaped, the green point.
- On Test 2, the footer entries for Arg, the seam, the time ramp, and T1–T3. They describe a different course.

## Add

- On Newton, the formula the student can say: z³ − 1 at the start, z² − 1 from that chip, and the product only once a dragged root has left those examples.
- Nothing else. No Mandelbrot, no more presets, no quiz, no finer picture, no second thread.

## Another batch

Yes. Four user-visible rounds, in this order. They are cuts. When they are done, the batch loop should stop.

1. **One door per picture.** Test 2 home keeps the switch, the lede, and two stops. Fold the three-line plan into those stops. Remove the topic chips and the F1 badge. A topic link may still open its station, but it should not pretend to be a different lesson.

2. **Julia is one picture.** The set fills the page. c is a drag handle in a compact control, plus the plain chips and the two typed parts. Remove "How far we look". Remove rabbit, or make the chip stay pressed on the value it claims.

3. **Newton says the polynomial out loud.** The formula opens as z³ − 1. Remove the degree chips. Keep dragging a root, the green walk, and the z² − 1 chip. One moved root is the whole lesson that the symmetric picture is not the only picture. Remove the step slider.

4. **The colour key tells the truth on the page you are on.** Test 2's footer names blue, orange, purple, and green the way these two pictures use them. Each station's own key shrinks to those lines.

## Batch 2

Branch `cursor/test2-fractals-2891`, commit `44093b3`. Same walk as batch 1, on a local server in headless Chrome: Test 1 home, the switch, Test 2 home, Julia (the three chips, a drag of c, a typed real part), Newton (the opening formula, the z² − 1 chip, a drag of the blue root, a drag of the green guess), the footer colour key on both pictures and on `#addresses`, a 390px-wide window, `#topic-J1`, and a reload on `#julia`. No console errors. No horizontal scroll at 390px.

## Verdict

Batch 2 did the cutting it was asked to do, and Test 2 now feels like the study map. Home is the switch, one sentence, and one door for each picture. Julia is one set: at c = 0 it is a disk, and dragging c breaks it. Newton says z³ − 1 at the start, z² − 1 from that chip, and the product once a root has moved. The footer has stopped describing Arg and the threads. What remains is a few sentences around pictures that already teach: a colour key written for both pages at once, and on Julia a second telling of the rule plus a dashed circle. That is not another exhibit. The loop should rest. No Mandelbrot.

## The four checks

**One door per picture.** Yes. Test 2 home has two articles and two links, `#julia` and `#newton`. The topic row, the plan panel, the start button, and the F1 badge are gone. The menu is The Map, Julia, Newton, with no thread dots. `#topic-J1` opens Julia and adds no callout. Test 1 home is unchanged: twelve topic chips, 21 menu stops, and no Julia.

**Julia is one picture.** Yes. One canvas. No rabbit chip, no escape slider, no step slider, and no second plane. c sits on a small crosshair. c = 0 stays pressed, and the green walk from 0.45 + 0.2i is still inside after 40 steps. Dragging the handle to about 0.87 + 0.62i breaks the disk, and the walk leaves on step 2. c = −0.75 stays pressed and the set pinches. c = i stays pressed and the walk leaves on step 3. Typing the real part keeps the imaginary part.

**Newton says the polynomial.** Yes. The formula opens as p(z) = z³ − 1, that chip is pressed, and the guess 0.35 + 0.45i reaches the purple root in 5 steps. The z² − 1 chip writes that polynomial, hides the purple root, and stays pressed. Dragging the blue root to about 0.50 − 0.61i clears both chips, and the formula becomes the product (z − (0.499 − 0.613i))(z − (−0.5 + 0.866i))(z − (−0.5 − 0.866i)). The basins follow the root. Dragging the green guess updates the walk.

**The colour key matches the page.** The other course is gone, and the swatches are the right colours. On Test 2 the key is four lines: blue, orange, purple, green. Arg, the seam, the time ramp, and T1–T3 stay hidden. On `#addresses` the Test 1 key is back, including Arg and the seam. The miss is that each Test 2 line is about both pictures. On Julia, purple is defined as a Newton root that is not on the page, and orange is “a walk that escaped” while the handle being dragged is that same orange. On Newton, the first words for blue and orange are still the Julia meanings.

## What clicks

The home page is the right length. Each stop says the gesture: leave c at 0 and drag until the disk breaks; leave the cube roots, drag the green guess, then drag a root. That is the old three-line plan, living on the doors.

The chips tell the truth. On Julia, c = 0, c = −0.75, and c = i light only on the value they claim, and they go dark as soon as the handle moves. On Newton, z³ − 1 is lit at the start, z² − 1 is lit after that chip, and both go dark once a root leaves the example.

The two gestures are the lesson, and they are easier to see with the furniture gone. The c pad reads as a control. On Newton the roots are on the picture you are reading. A reload on `#julia` stays on Test 2. `#addresses` is still Test 1. A 390px window stacks the Julia picture over the pad and does not scroll sideways.

## What still snags

**The colour key is a caption for the pair.** The swatches match. The sentences try to stay true on both pages, so on the page in front of you half of each line is about the other picture. A student who opens the key on Julia to learn the orange handle is told that orange means escaped.

**Julia says the rule twice, and it still draws the old ruler.** The lede already says square, then slide, and that the blue region is who stays. The panel “The rule” says that again, and then shows z_{n+1} = z_n^2 + c, which is the line worth keeping. The dashed orange circle is the escape radius after its slider was removed. The readout names the circle only when the walk leaves. At c = 0 the circle sits outside the disk as a second ring.

**The product is the right polynomial, and it is hard to say.** After the drag it is a string of parentheses and three-decimal roots, including 0.866 for a root that was not moved. That is what the product is. It needs no prettier form and no new control.

The menu still heads its three rows with “A · Two pictures”. The page does not. Leave the banner.

## Cut

Nothing that needs another pass through the map. If a later edit is already touching a sentence:

- On Julia’s colour key: blue stayed, orange escaped, green is the walk, and the orange handle is c. Leave purple off that page.
- On Newton’s colour key: blue, orange, and purple are the three roots, and green is the guess.
- The second paragraph under Julia’s “The rule”, and the dashed circle.

## Add

Nothing. No Mandelbrot, no presets, no quiz, no finer picture, no thread.

## Another batch

No. The four rounds landed. A student can choose Test 2, drag c, and drag a root, and the page says what those gestures do. The leftovers are sentences. The loop should rest.

## Julia film, batch 1

Branch `cursor/julia-c-animation-2891`, commit `8514992`. Used like a student on a local server in headless Chrome: `#julia` at c = 0, then the orange handle along the real axis to −0.75, across the cusp to 0.45, straight up to i, in an L, in a scribble around the pad, in a short nudge from 0.20 to 0.32, and in a 3px slip. Also an off-centre press, the three chips, a typed real part, Play again, a 390px window with the pad scrolled into view, and one drag with reduced motion. Frames were grabbed from the canvas while the film ran, and a few were held still so the shapes could be read. No console errors. No horizontal scroll at 390px.

## Verdict

The thing to be able to do is move c and watch the filled set change, and stop where it changes. This batch pauses the picture, plays a slideshow of the path, and then leaves a picture that is not the set. Held still, the frames of the slow pinch do show the disk growing a waist. At the speed they play, and at the count a real drag gets, that is a flicker, and the graph you are left studying is a magnified corner. Another batch is worth doing only to take the film back out. After that, stop.

## What I could actually see

At c = 0 the picture is a blue disk and the green walk from 0.45 + 0.2i is still inside. The pad says to drag and let go. While the button is down the disk stays the disk. The handle and the readout move anyway. Dragged to 0.45, the readout says the walk left the circle on step 5, and the graph still shows that walk inside the disk. On a phone, dragged to −0.75 + 0.3i, the readout says it left on step 9, over the same disk. The sentence that explains the pause is on the other panel. The picture panel still says to drag the green point.

Letting go does put “animation loading” in the middle of the graph before any frame. On this machine that label is on screen for about 50ms, three paints, and the first frame follows. A double animation frame during a forced longer wait returned in 27ms, so the page is not frozen. The words are the right idea and they are too brief to read. What you see is a flicker on the old picture.

The film is about 85–100ms a frame, and the whole thing is over in about 700ms. The last frame does not sit: the redraw starts in the same turn.

Held apart, the frames are honest samples of z² + c:

- Toward −0.75, six frames. At −0.45 and −0.60 the disk has a waist. That is the pinch, and it is the one morph that reads.
- Toward 0.45, four frames, at 0, 0.15, 0.30, 0.45. The inside is a disk, then it is gone. The cusp at 1/4 is not a frame.
- Up to i, eight frames. The disk warps, and the inside vanishes between 0.57i and 0.71i, in one cut.
- An L keeps a sample on the corner, then the vertical leg is three frames of an empty interior.
- A scribble around the pad is eight frames whose pictures barely share pixels (about 80 to 140 cells of a 24×24 sample change each step). Those are different sets in a row.
- A 3px slip, 0.063 units, is already a film, and the minimum is four frames of almost the same disk.

Eight is too few on every path where the set actually changes character. Four is what a careful short drag gets. The cap spends its frames on the length of the stroke, so a long drag is coarser exactly where a student has moved farther.

## The picture after you let go

When the film ends, the disk is gone. A fragment of the colouring sits in one corner of the graph, and “Drawing the set…” flashes while that happens. The c = 0 chip does not bring the disk back. The next film opens by popping the real disk in for its first frame, then does the same thing at the end. The same pair — disk while the pointer is down, fragment after the film — is what the 390px page does once the pad is on screen.

The playback draws into a smaller canvas. The ordinary redraw still paints a full-size image into that smaller canvas, and the graph shows one corner of it, stretched. From the first let-go until reload, the picture a student would study is that corner. The film is the only moment the set is on the page, and it lasts under a second.

## Play again

It is on screen from the first frame of the first play, with that label, and a click during the play does nothing. It stays after a chip. After the c = −0.75 chip, Play again runs the previous path and the handle jumps back to 0 before walking to −0.75 again. It is not how you restudy a frame. Dragging again is. Cut it.

## What still holds

Chips and typed numbers jump, and they do not invent a path. An off-centre press on the handle, with no move, leaves c at 0. Reduced motion skips the film: on the way to −0.75 the inside fraction went 0.193, then 0.177, then 0.137 while the pointer was still down, and the phase stayed idle. That is the gesture that teaches. The worker loads. Nothing in the console failed.

## Cut

- The film, the worker, the loading line, and Play again.
- The pause that keeps the old picture up while the readout names a new c.

## Add

Nothing. The live picture already changes with the handle under reduced motion. No more frames, no scrubber, no timeline, no speed control, no Mandelbrot.

## Another batch

Yes. Three rounds, then stop. They put back the picture you can stop on.

1. **The handle paints the set while it moves.** Delete the playback, the worker, the loading line, and Play again. A chip, a typed number, and an arrow key stay jumps.

2. **Letting go leaves that set.** The graph after a drag is the filled Julia set of the c you released on, at the ordinary resolution. A second drag, and the c = 0 chip, still are. The corner picture has to be gone with the film.

3. **Two drags, then stop.** From the disk, drag onto −0.75 and stop: a waist, and the readout agrees with the picture while the pointer is down. Drag past 1/4 and stop: the inside is gone. Phone width still does not scroll sideways. No new control.

## Julia film, batch 2

Branch `cursor/julia-c-animation-2891`, commit `0c2b0ed`. Served with `python3 -m http.server` and used like a student in headless Chrome on `#julia`. From the disk, the orange handle went to −0.75, across 1/4 to 0.45, straight up to i, in an L through −0.75 then up to −0.75 + 0.75i, and in a loop around the pad (length about 5.7). Each path at each step, 0.04, 0.08, 0.12, and 0.2. Frames were taken from the canvas while the film ran. No console errors. A 390px window does not scroll sideways.

## Verdict

Keep the film. This batch makes it the thing Shael asked for: let go, the graph says animation loading, then the set walks along the drag, one frame per step, and a longer drag gets more frames. At the opening step, 0.08, a straight drag lasts about a second to a second and a half, the pictures change by a little, and you can see the waist deepen, the inside fail just past 1/4, and the inside fail again on the way up to i. The still afterwards is the full set, centered, of the c you released on. The corner of an L is a frame.

Three things keep it from being finished. The c you release on is sampled and then skipped as a beat of the movie, so at the coarse step the waist arrives after the film. A long scribble plays the same 48 frames whether the line says 0.04, 0.08, or 0.12. And the loading count runs through every integer in a tenth of a second, in a box over the middle of the set. Another batch is worth doing. Three rounds, then stop.

## What the four steps feel like

The pictures are about 85 ms apart, sometimes 100. Nothing waited on the next frame. The first picture is up about 45 ms after you let go.

**0.08, the step the page opens on.** This is the film. To −0.75: 11 samples, 10 pictures, 1.2 s. The blue share falls 0.191, 0.190, 0.188, 0.185, 0.180, 0.174, 0.166, 0.156, 0.146, 0.130, about 2% of the picture each frame, and the last of those is c = −0.72. To 0.45: 0.9 s, and the frames land on 0, 0.08, 0.16, 0.24, 0.32, 0.40. The inside is still there at 0.24 (blue 0.180) and gone at 0.32. Up to i: 1.5 s. The inside shrinks through 0.64i (blue 0.098) and is gone at 0.72i. The L keeps (−0.75, 0), where the set is pinched, then the upward leg empties it. That is smooth where the set changes smoothly. Crossing out of the black shape is still one cut, and that cut is the mathematics.

**0.04.** Smoother, and a bit leisurely. The waist is 2.1 s and the early frames are almost the same disk (about 1% of the picture). Up to i is 2.6 s, and the loss of the inside sits between 0.64i and 0.68i, with a frame on each side. The L is 3.8 s. A straight drag at this step is still worth watching. It is the fine end, and it should stay the fine end.

**0.12.** Still a morph. The waist is 1.0 s, seven pictures, and the blue share falls the same way in larger bites. The drag past 1/4 still has a frame at 0.24 and dust at 0.36. Usable, coarser.

**0.2.** Too fast, and too coarse for the lesson. The waist is four pictures in 0.7 s and the last of them is −0.6. The pinch at −0.75 is the still after the movie. The drag to 0.45 goes 0, 0.2, 0.4: a disk, then nothing, and 1/4 is not a frame. Up to i loses the inside between 0.6i and 0.8i in one cut. This is the far end of the trade. Leave it there. A coarser step would give up the film.

**The scribble.** Length 5.7. At 0.04, 0.08, and 0.12 it is one film: 48 frames, 4.6 s, steps from about 0.08 to 0.16, and the same blue numbers in the same order. The line under the buttons still said 0.04, then 0.08, then 0.12. Pressing − did not change the next movie. At 0.2 it shortens to 30 frames and 2.9 s, with gaps up to 0.30. Along that loop the inside dies, comes back on the left, dies again, and returns near 0. Neighboring frames often share little. 4.6 s of that is long. The cap is why the finer steps cannot make it smoother.

## The loading line

On release the graph says “animation loading, 0 of N frames”, in a white box over the middle of the set. Every integer is written. On the waist at 0.08 the count is finished by about 45 ms. On the 48-frame scribble it is finished by about 130 ms. A screenshot caught “animation loading, 1 of 11 frames” on top of the disk. The words are the right words. The fraction is gone before it can be read, so it does not feel like progress. Once the count finishes, the box leaves and the rest of the film is clear. The page kept painting on time through all of this.

## The still picture while the button is down

The graph stays the disk. The readout stays “c = 0” and “still inside after 40 steps”. The two typed parts stay 0 and 0. The c = 0 chip stays pressed. The orange point, and its name, move to the place you dragged. The picture and the numbers agree, which is the repair from last batch. It is still a slightly dead gesture: the graph gives no sign until you let go. The paragraph on the pad tells you that, and after one film the freeze means “the movie starts when you let go.” The lit chip is the part that looks like a miss. The handle is at −0.75 and the page still says the example c = 0 is chosen.

The caption on the picture still says to drag the green point. That drag is the walk. The film is the other drag, and its sentence is on the other panel.

## The step, in words

“Each frame, c moves 0.08.” Minus and plus change that number. At 0.04 the minus is grey. At 0.2 the plus is grey. The sentence is plain, and the number is the trade: a bigger move between frames is a coarser, shorter film. It does not need the words “smoother” and “duration.” It does need to stay true. On the scribble it stayed at 0.04 while the frames were about 0.12 apart. Pressing plus during a film changed the sentence to 0.08 and left that film on its 26 frames. The new number waits for the next drag. That part is right.

## After you let go

Every film showed one fewer picture than it had sampled. The missing picture is the c where the pointer came up. The still that follows is that c, the full set, centered, opaque, and the blue share matches it (0.124 at −0.75, a speck at 0.45, the disk again when the loop ends near 0). There was no corner picture and no blank frame in the samples after the film. At step 0.04 the last gap is 0.03, so the still is almost the last frame. At step 0.2 the film stops on −0.6 and the waist appears as that still. The end of the movie should be a beat, like the other frames.

Play again is there when the film ends. It replayed the waist, ten pictures in 1.1 s, and the button came back. It plays the same render again, loading flicker included, and it cannot stop on a frame. The still is how you study the end. Another drag is how you see another path.

The green walk updates with the frames. On the way past 1/4 you see that same start leave. That belongs in the film. The dashed circle stayed the circle of radius 2 on these paths.

## Cut

- Play again.
- The fraction on the loading line. Keep “animation loading”.
- The pressed state on c = 0 while the handle is away from 0. The picture and the readout staying put is right.
- The picture’s sentence about dragging the green point, if that caption is already being touched. The walk is still there to drag.

## Add

Nothing. No Mandelbrot, no scrubber, no timeline, no speed slider, no fifth step. 0.2 is already the coarse end.

## Another batch

Yes. Three rounds, then stop. Keep the film.

1. **The last frame sits.** The c you release on is a frame of the movie, held for the same beat as the others, and the still afterwards is that picture. At step 0.2, a drag from the disk to −0.75 shows the waist while the film is playing. A drag to 0.45 shows the dust as a frame, and a drag to i shows i as a frame.

2. **The sentence and the film use one step.** A loop the length of this scribble must change when the step changes. When 48 frames forces a wider step, the line says that wider step. No new control. 0.04, 0.08, and 0.12 have to stop being the same movie.

3. **The loading line can be read, then it leaves.** The graph says “animation loading” until the first frame is drawn, and then the box is gone. The fraction that ticks through every count in a tenth of a second comes off, so it does not cover the set. No bar and no speed control.

## Icon — one point, two addresses

Looked at a 512 render and at the same pixels scaled to 16 with a nearest-neighbour zoom, on the dark tile.

### First mark

A stroked orange arc, a thin cream border, and a small symbol sitting in the middle of the tile. At 512 the two addresses were clear: blue legs, orange ray, orange arc, cream dot. At 16 the arc and the ray became one orange smear, the border ate the edge, and the dot was a speck. It did not read as two addresses. It read as a muddy corner.

### Second mark

The arc became a filled wedge in the angle, the strokes got thicker, and the symbol grew toward the tile. The cream rim stayed, but only as a hairline so a dark browser tab still has an edge. At 16 the blue corner and the orange diagonal stay separate colours. The cream dot is the point they share. The wedge is the angle, not a second ray. It is not a π, a Σ, or a set of axes with no point. Maskable 192 and 512 place that tile in the center 80 percent so a circle crop keeps the point.

The header hook uses the same legs, wedge, ray, and dot, and keeps the faint axes, because the header has room for them and the 16px tab does not.
