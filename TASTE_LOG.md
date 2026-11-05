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

## Homework batch 1

Branch `cursor/homework-ch4-hints-copy-md-a873`. The walk was `0e7bdfe`, served with `python3 -m http.server`: `#index` on Test 2, the Homework chip, all seven cards, Copy Markdown on each, then the station or film each hint names. A 390px window. A return from the Exercise 5 chip on The Orbit of 0. No sideways scroll at 390px or at 1280px. Before this note was pushed, `f88fd14` changed the Exercise 5 hint and the One Newton Step summary. I reloaded the card. The stations were unchanged.

## Verdict

Keep, with cuts. The thing to be able to do is here. Homework shows these seven cards and nothing else: 4.1.3, 4.1.13, 4.2.4, 4.2.5, 4.2.3, 4.3.1, 4.3.2. The count says `7 shown. Homework.` Each card has the hint in the open, Copy Markdown, and Tick. None of them has Show. The clipboard body is the statement in LaTeX, the book link, the stop, the hint, a blank `## Your solution`, and a Check note that the export has no answer key. I pasted all seven. None of them contains an epsilon write-up, the iteration count, the part (c) criterion, the orbit list, or a closed form.

One picture still calls part (a) Exercise 1(b). The way back from a station drops the filter. The Exercise 5 hint, as of `f88fd14`, tells the truth about the other two pictures and still sends you there. That is a sentence pass. Another batch is worth doing for those cuts. After that, stop.

## What I could actually do

The index opens on Core, 25 cards. Homework is one chip, under the title. Pressing it sets the scope row to Any scope and leaves the seven assigned cards. On a phone the same chip still says 7 shown, the card is inside the window, and Copy Markdown sits on the card.

4.1.3 and 4.1.13 open A Sequence Has a Fate. The cite on the page is Definition 4.1, page 103. The film is The terms land, or they do not, and it walks `(1/2 + i/4)^n`, which is Exercise 1. The hints say conjugation keeps the modulus, and that Theorem 4.1 already wrote the real part. They do not write the epsilon. The film is a cousin of 4.1.3. It is a long way from the imaginary-part line in 4.1.13. The definition is the part that helps.

4.2.4 opens When c Is 0, a Disk, on `|z| < 1`. The four chips are inside, outside, `z = −1`, and a non-real cube root of 1. The moduli are on the page. The sentence for the cube root says it cycles and does not settle at 1, and that the index does not print the criterion. The Julia picture opens at `c = 0`. That is the map the hint named.

4.2.5 opens The Orbit of 0 on `c = i`. The chip `c = −2` is on the page. Pressing it lists `0, −2, 2, 2, 2, …` and hands `c = −2` to the film. The sentence tells you to read the list and apply Theorem 4.9, page 113. The card still does not print the list. The list is the arithmetic the hint told you to do.

4.2.3 opens One Newton Step on the five steps of `z^2 + 1` from Example 4.7. Under that table, one line says degree 1 is `az + b` and the index does not print the count. The film is Five Newton steps land on i. The hint already says that film is the quadratic case.

4.3.1’s card says the assigned part is (b), ratio `1/(2+i)`, and does not print the sum. 4.3.2’s card says rewrite in `w = (z+i)/2` and names the two chips. Those chips are on Geometric Series. `z = 0` settles (`1`, then `1 + 0.5i`, and the terms sit down). `z = 3i` runs off (`1`, `1 + 2i`, `−3 + 2i`, …). The sentences say `|w| = 1/2` and `|z+i| = 4`. That pair is the demo for Exercise 2.

Copy Markdown on every homework card returned Copied, then the label went back to Copy Markdown. The bodies match the sketch: pin, statement, book link, where to look, hint, blank solution, check.

## What confuses

**Geometric Series calls part (a) Exercise 1(b).** The page opens on the chip `(1+i)/2`. The sentence under the sums says: “Exercise 1(b) is this theorem with ratio `1/(2+i)`.” The sums on screen are the ratio `(1+i)/2`, which is part (a). Part (b)’s ratio is not a chip. The hint on the card is right. The first picture the hint sends you to contradicts it.

**Exercise 5 still offers two other pictures.** On `0e7bdfe` the hint said the Mandelbrot set and The Crossing show the same `c`. They do not. Mandelbrot opens on `c = −0.5`, with chips `−0.5`, `0.2`, `1/4`, and `0.4`. The Crossing opens on `c = i`, with chips `i`, `0`, `Disk`, and `Out`, and the caption is Example 4.10. `f88fd14` rewrote the hint. It now says the Mandelbrot set opens on `c = −0.5`, The Crossing opens on `c = i`, and to move either point to `−2`. That matches what those pages do when they open. It is still a second trip. The chip `c = −2` on The Orbit of 0 already lists the walk. The film paragraph on that stop still narrates `c = i` and `c = 0.3` after the chip is pressed. The sentence under the chip says the picture’s pad stops at 1.6. The Julia real-part field goes from −2 to 2.

**The way back leaves the set.** The Exercise 5 chip on The Orbit of 0 returns to `#index-4-2-5`. The card is outlined, and Copy Markdown is on it. The filter is All and Core, and the count is 25 shown. Homework has to be pressed again.

**Exercise 3’s film is the other polynomial.** The hint says so, in the same sentence that tells you to open the stop. The degree-1 line is under the quadratic table, and it does not give the count. `f88fd14` took “A line needs only one step” off the stop’s summary. The algebra is still yours. The film is a detour the hint has to apologise for.

The disk sentences do say the fate of 4(a) and 4(b): inside, the terms go to 0; outside, the moduli grow. The numbers are on the same lines. The criterion for 4(c) is not printed. I would leave those sentences. They are the four starts the hint promised.

The seven cards are in map order, so 4.2.4 and 4.2.5 sit above 4.2.3. The pins are the exercise numbers. That is readable. It is not the order of the section.

Each homework card also says “Homework. Hint only. No solution on this card.” and the hint ends with “This card does not print …” The mark already said it.

## What clicks

The filter is one chip and a true count. The cards quote the exercise, name one stop, and leave the write-up blank. The disk’s four starts are the four starts in Exercise 4. The two disk chips on Geometric Series are Exercise 2, and the sums do what the sentences say. The `c = −2` list is the orbit, on the stop the hint named, and the card still has no reveal.

## Cut

- On Geometric Series, the sentence that calls the `(1+i)/2` chip Exercise 1(b). That chip is part (a). Part (b) stays in the hint: Theorem 4.12 with ratio `1/(2+i)`.
- On the Exercise 5 hint, the two sentences about the Mandelbrot set and The Crossing. The chip on The Orbit of 0 is the demo. On that page, “The picture’s pad stops at 1.6.”
- The film sentence on the Exercise 3 hint. Keep “Open One Newton Step” and the degree-1 line. Leave the disk’s four fate sentences.
- The repeated “This card does not print …” at the end of each hint. The mark on the card is enough.
- The filter reset on the way back. A homework card opened from a station chip should leave Homework pressed.

## Add

Nothing. No chip for `1/(2+i)`. No new film. No `c = −2` chip on The Crossing. The orbit list and the two Exercise 2 chips are the demos.

## Another batch

Yes. One pass, then stop. It is the cuts above. The set, the copy, and the blank solution already do the job. A second batch that adds pictures, or that starts the next section’s exercises, is not worth doing.

## Homework sentence pass

Branch `cursor/homework-ch4-hints-copy-md-a873`, after `f88fd14`. The three cuts from the taste note above, and then stop.

The sentence under the `(1+i)/2` sums no longer calls that chip Exercise 1(b). Part (b) stays in the hint, ratio `1/(2+i)`. There is no new chip. The Exercise 5 hint no longer opens the Mandelbrot set or The Crossing. The chip `c = −2` on The Orbit of 0 is the demo, and that note no longer says the pad stops at 1.6. The Exercise 3 hint no longer names the quadratic film. A fresh card link still opens on All. After Homework is pressed, the station chip back to `#index-4-2-5` leaves Homework pressed, scope Any, and seven cards. Copy Markdown, the disk’s four starts, the `c = −2` list, and the Exercise 2 chips are unchanged.

## Book path, batch 1

Branch `cursor/book-chapter-path-df29`, commit `ad216c1`. Used like a MAT 412 student on a local server in headless Chrome, light theme, fresh storage. `#book` and `#chapter-4` at 1280×800 and at 390×844. I walked Chapter 4 toward the end: the sequence station and its cycle chip, Exercise 3’s chip through to the index, the hint, Copy Markdown, both 4.1 ticks, the mark, Exercise 5’s picture, the `c = −2` chip, then the rest of the ticks and marks. Reload, `#chapter-5`, `#chapter-1`, and a leftover `#chapter-6-6-1`. On the phone, the first screen, the Chapter 4 node, section 4.2, one card, and the menu. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The thing we are trying to be able to do is walk Chapter 4 until the four sentences are ours and the eight exercises are done, then see the book move. This batch can remember that, and the four sentences are the right voice. The page around them is the old homework packet, filed under four headings, with a second tick and a mark. I finished 4.2, 4.3, and 4.4 by clicking Tick and Mark and never opened their pictures. Another batch is worth doing only as a cutting batch on this path. After that, stop. Do not build Chapter 5 in this shape.

## What I could actually do

`#book` opens on the status and one dark button, Walk Chapter 4. The button is in the first screen at both widths. The page under it is the printed contents: 11 chapters, 66 section rows, about 4000px at 1280 and about 6200px at 390. Chapter 4, the chapter marked Next, starts below the fold. At 390 its top is about 1900px down, under Chapter 1’s six sections.

The walk button’s address is `#chapter-4-4-1`. The chapter title, the lede, and the link back to the book sit above the screen (the title was 146px above the window). The dark button on that screen says Go to 4.1 while 4.1 is the section in front of you. The sentence under 4.1 is the one worth keeping: a sequence settles when its terms eventually sit in every disk around the limit.

Opening A Sequence Has a Fate leaves the chapter. The sidebar switches from Test 1 to Test 2, because the station belongs to Test 2. Nothing on that page links back to Chapter 4. The list on the station is Exercise 1(a): `(1/2 + i/4)^n` settles at 0. The other chip is Exercise 7, the point that stays on the unit circle. Exercise 3, the card I came from, is a proof that conjugation preserves the limit. The station’s exercise chips go to `#index-4-1-3`. The index opens that card with the hint already showing, and it says the assigned seven walk on Chapter 4. Three pages, and the picture I was sent to is a different exercise.

Show the hint on the chapter stays closed until asked, and it names the disk in Definition 4.1. Copy Markdown changes to Copied. Ticking 4.1.3 and 4.1.13 leaves the status at “Next is 4.1” and “0 of 4 sections finished, 2 of 8 exercises.” The same card on the index still says Tick. Marking 4.1 is what moves Next to 4.2. Unmarking sends Next back to 4.1 with both exercises still ticked. On the phone I marked 4.4 and ticked its exercise while 4.1 was still Next. The section went Done. The status stayed on 4.1. A reload kept the tick.

Section 4.2 is the section that shows the shape. The sentence is one idea: the Julia set of `z^2 + c` is one piece exactly when the orbit of 0 stays bounded. Under it are six links out to the textbook, then seven picture chips (Newton’s step, the Newton fractal, the disk, Julia, the orbit, the Mandelbrot set, the cardioid), then three exercise cards. On a phone that section is about 2500px tall, and the picture chips are 36px tall. The sidebar, once a picture has been opened, is the same list again.

Exercise 5’s picture link opens The Orbit of 0 on `c = i`, which is Example 4.10. Pressing `c = −2` is the exercise: the list is 0, −2, 2, 2, 2, 2, 2, 2, and the line under it cites Theorem 4.9. That is the wonder in this batch. The chapter does not land on it, and the station has no way back except the browser. Back did return to the outlined card, with the earlier tick still on.

Go to 4.2 does put 4.2’s title under the header (88px of room). The room is large enough that the previous section’s dark button, Mark 4.1 done, hangs under the site header. On the phone that button is the first thing on the 4.2 screen.

Section 4.4 is the size the others should be. One sentence, two theorem links, one picture, one exercise. The question is the radius question, and the card says there is no solution on it.

Twelve clicks finish the chapter: eight ticks and four marks. The status becomes “Done. 4 of 4 sections, 8 of 8 exercises.” The book’s button becomes Open Chapter 5, and a reload keeps “Chapter 4 is done.” The lede on the book still says to walk Chapter 4 until every exercise is done. Chapter 4’s Done flag is on the node, which is still below Chapter 1.

Chapter 5 is five cards. Four of them say “Not drawn on this page yet.” Section 5.4 adds the current and the impedance, and says the rest is not drawn. The footer says “Chapter 4 is the walk that is open now,” after the book has already called Chapter 4 done. `#chapter-1` stays on the roadmap and scrolls to Complex Numbers. `#chapter-6-6-1` is “No such place,” and the recovery list is the stations of whichever test the sidebar last remembered.

The menu on the book is Which test, plus 24 stations. A fresh phone visit to Chapter 4 opens that menu on Test 1: the staircase, the roots, the curves. The Book is the current row, and the drawer covers the exercise. The colour key on the book is the Test 1 key: blue is the Cartesian address, orange is polar, and the rest of that course. The book page has no picture.

## What clicks

The four sentences are in the site’s voice, and each one is a thing a student can say. 4.4 shows the size that voice wants: the sentence, the picture it names, the exercise.

Walk Chapter 4 is one dark button, and it is on the first screen at 1280 and at 390. When the flags are all on, that button becomes Open Chapter 5. The browser remembers it.

The hint on the chapter stays closed. The card does not print a solution. Copy Markdown admits that it copied. A deep link to `#chapter-4-4-2-5` outlines that card and clears the header.

The orbit at `c = −2` is the moment the chapter is promising. The steps sit there, bounded, and the sentence names Exercise 5 and Theorem 4.9.

Later chapters do not pretend to be pages. A bad token on one of them is still no such place.

## What gets in the way

**Two scores, and a mark that can cancel both.** The chapter tick and the index tick are different memories. Finishing an exercise on the walk leaves the index card unticked. A section counts as finished only when it is also marked, so two ticked proofs and an unmarked section are still “Next is 4.1.” The reverse is just as easy: 4.4 can be Done while the walk still says to start at 4.1. The lede tells you to mark a section when you can say its sentence. The button does not check that. It checks that you clicked it.

**The picture is a door out, and it often opens on a different exercise.** Exercise 3’s picture demonstrates Exercise 1(a) and Exercise 7, then offers the index. Exercise 5’s picture opens on `c = i`. The hint knows the chip is `c = −2`. The link does not. From either station the way back to the chapter is the browser, or The Book at the top of a menu that has just become the other test.

**4.2 is a contents list of the test.** Seven pictures of equal weight, six readings, three exercises, and a sidebar that repeats the pictures. The sentence is about the orbit of 0. Newton’s fractal, the Mandelbrot set, and the cardioid are other lessons sitting in the same box.

**The book is the table of contents, and the menu is a test.** Eleven chapter titles would be a roadmap. Sixty-six section rows of chapters you cannot open are a PDF contents page. The first screen at 390 is Chapter 1. The menu beside all of this asks which test, and a fresh visit answers Test 1 while the page says walk Chapter 4. Opening any picture changes that answer under you.

**The reward for finishing is a page of blanks.** Chapter 5 says the exponential is the next page, then says it four more times. The footer still calls Chapter 4 the walk that is open.

## Cut

- Mark section done. An exercise tick is the section. The status names the next exercise.
- The index Tick on these eight cards. One score, on the chapter. Leave the other index cards alone. Do not add a sync between the two stores.
- The Pictures row. The exercise already names its picture. In 4.2 that row is the whole test map.
- The reading list, down to the one pin the sentence is. 4.2’s six links are a bibliography.
- The per-card line “Homework. The hint points at a picture. No solution on this card.” The chapter already said the hint stays closed, and the card has no solution on it.
- Copy Markdown on every chapter card. The walk is the job. One export for the chapter is enough if the paste-into-an-LLM habit is still wanted, and it can live once.
- Section rows on Later chapters. Title, page, Later. Chapters 1–3 keep the single “already drawn” door.
- The Chapter 5 page, until a section on it is a real walk. The book can say Chapter 5 is next without opening five blanks. With the page gone, the stale footer line goes too.
- The second sentence of the book lede. The status line is the instruction, and it is the line that changes when you finish.
- On the book and the chapter, Which test and the station menu. The menu for this route is the chapters.

## Add

- The picture link opens the chip the exercise uses. Exercise 5 opens `c = −2`. The page it opens has one link back to that exercise.
- Nothing else. No new picture, no check that the proof was typed, no progress layer, no Chapter 5 dossier.

## Another batch

Yes. One batch, and it is these cuts. The order is the chapter first, then the book.

1. **Chapter 4 is four sentences and eight exercises.** Cut the mark, the pictures row, the extra readings, the homework banner, and the eight copy buttons. The status names the next exercise. The Walk button opens the chapter at its title. Go to 4.2 appears when 4.1’s exercises are ticked.

2. **The picture is the exercise’s chip, and it returns.** Exercise 5 opens on `c = −2`. Exercise 3’s picture can stay the sequence station if the card calls it the disk from Definition 4.1, and the station stops sending that exercise to the index. One link back to the chapter card.

3. **The book is eleven chapters.** Later chapters lose their section lists. Chapter 5 stays a node that says Open, and its page waits. The menu on `#book` and `#chapter-4` is the book.

When those three are done, stop. A Chapter 5 batch that copies this page will feel like the homework again, five times.

## Book path, batch 2

Branch `cursor/book-chapter-path-df29`, commit `05bda17`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev, light theme. Laptop 1280×800, fresh storage: `#book`, Walk Chapter 4, both 4.1 ticks, Go to 4.2, the sequence picture and the way back, Exercise 5’s picture and the way back, the disk, One Newton Step, both geometric pictures, the radius, a reload, then the rest of the ticks. The book after that, Chapter 5, the index, an untick of 4.4.6 on the index, `#chapter-1`, and `#chapter-6-6-1`. Phone 390×844, fresh storage: `#book` and Walk Chapter 4. The menu, one card, Exercise 5, the way back, and the index were the same phone width with the laptop’s ticks already stored. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The thing we are trying to be able to do is walk Chapter 4 until the four sentences are ours and the eight exercises are done, then see that Chapter 5 is next and still closed. This batch did that cutting. The chapter is four sentences and eight exercises. The status names the next exercise. A tick is the only score, and the index shows the same tick. The picture opens on the exercise’s chip and the link brings you back to that card.

It feels like a path through the exercises. The packet is gone: no mark, no pictures row, no copy button, no homework line. It is not yet a walk through the ideas, because the picture the chapter is for, the orbit at `c = −2`, is below a film that fills the screen. Chapter 5 is one sentence, and it is not ready for this shape. Another batch is worth doing. It is the doors. After that, stop.

## What I could actually do

`#book` opens on the status, “Next is §4.1, Exercise 3. 0 of 8 exercises,” and one dark button, Walk Chapter 4. The button is on the first screen at 1280 and at 390. The page under it is eleven chapters. Chapters 1–3 are Later, with the one station already drawn. Chapter 4 is Next, and it keeps its four section rows. Chapter 5 is Open: “The walk through these sections is not drawn yet.” Chapters 6–11 are the title, the page, and Later. The book is about 2080px at 1280 and about 2440px at 390. Chapter 4’s node starts just below the phone’s first screen. The menu is the eleven chapters. Which test is gone. The colour key is not on the page.

Walk opens `#chapter-4` with the title on screen (the title sat 103px down, under a 56px header). Go to 4.2 is hidden. Section 4.1 is the sentence about the disk, Definition 4.1 and Theorem 4.1, and two cards. Ticking 4.1.3 moves Next to Exercise 13, “1 of 8.” Ticking 4.1.13 moves Next to §4.2, Exercise 3, “2 of 8,” and the button says Go to 4.2. The same pattern runs to the end: Go to 4.3 after Exercise 5, Go to 4.4 after Exercise 2, then “Done. 8 of 8 exercises” and Back to the book. A reload on the card I had just returned to kept the ticks.

The book then says “Done. 8 of 8 exercises. Chapter 5 is next, and its walk is not drawn yet.” The button is Open Chapter 5. Chapter 4’s four rows say Done. Chapter 5’s page is the title, one sentence, the source tag, and Back to the book. No blank sections. The footer says chapters 4 and 5 are open, which is what the nodes say.

Each picture link opens the chip the card names, and the header link returns to that card, outlined.

- Exercise 3 and Exercise 13 open A Sequence Has a Fate on `(1/2 + i/4)^n`. The terms’ moduli fall: 0.559, 0.3125, 0.1747, and on down. The chips for those two exercises point at the chapter. Exercise 1 and Exercise 7 still point at the index.
- Exercise 4 opens When c Is 0, a Disk on `|z| < 1`, and that chip is on the first screen.
- Exercise 5 opens The Orbit of 0 with `c = −2` pressed. The list is 0, −2, 2, 2, 2, 2, 2, 2. The line under it cites Theorem 4.9 and Exercise 5.
- Exercise 3 in 4.2 opens One Newton Step and links back to the chapter card.
- Exercise 1 in 4.3 opens Geometric Series on `(1+i)/2`. The partial sums are on the page. Exercise 2 opens the chip `z = 0 in D₂(−i)`, and the note gives `|w| = 1/2`.
- Exercise 6 opens A Radius, Then a Wall on `|z| = 1`.

The index, after the eight ticks, says “25 shown. Ticked 8 of 30.” Each of the eight cards says Ticked. Copy Markdown is still there. 4.4.6 still hides its check behind Show. Unticking 4.4.6 on the index makes the chapter say “Next is §4.4, Exercise 6. 7 of 8 exercises,” and the chapter’s own button says Tick. A reload of the index keeps the ticks.

`#chapter-1` stays on the book and scrolls to Complex Numbers. `#chapter-6-6-1` is “No such place.” The recovery list is the test the sidebar last remembered.

On the phone the chapter title is two lines and on screen. The tick is 44px tall. The menu is the eleven chapters and it covers the page. Nothing scrolls sideways.

## What clicks

The four sentences are still the right voice, and each section is now that sentence, the pin it needs, and the exercises. 4.4 is 524px. 4.2 is 1311px because Exercise 4’s statement is long, not because the test map is sitting in the section.

Walk Chapter 4 is one button, and it lands on the title. The status is the instruction, and it changes when a tick changes. One tick is one memory. The index and the chapter move together.

The chips tell the truth about which example is open. `c = −2` stays pressed. `|z| < 1`, `(1+i)/2`, `z = 0 in D₂(−i)`, and `|z| = 1` stay pressed. The way back is the exercise’s name, and it outlines the card.

Chapter 5 refuses to be a dossier. Later chapters refuse to be a contents page. The menu on this route is the book.

## What gets in the way

**The orbit you came for is under the film.** From the chapter, Exercise 5 lands on `#zero-chapter-4-2-5` with `c = −2` pressed, and the list is the right list. The chip sits at 1713px. The first screen ends on the film’s title. The film is about 1173px tall. Inside it, `c = −2` and the steps 0, −2, 2, 2 share a frame with `c = 0.3` and the word Leaves. The sentence above the film says the pressed chip is `c = −2`, then tells you to pause. The plain list, and the line that says Exercise 5, are after all of that. On the phone the same film is the next screen. The link back works. The lesson is still a scroll away.

**The sequence picture names a different exercise.** Both 4.1 cards call the picture “The disk in Definition 4.1,” and the station no longer sends those exercises to the index. The note under the terms says “Exercise 1(a) asks for this limit. What the book prints is closed on the index.” A student who came to prove conjugation is told the picture is someone else’s exercise, and that the write-up is on the index.

**Go to 4.2 lands on the previous tick.** The section title is on screen, 184px down. The Ticked button of Exercise 13 sits at 50px, in the gap under the header. The same gap shows when you scroll a section to the top. The button that used to say Mark is gone. Its shadow is the last tick of the section you just finished.

**4.2’s sentence is one theorem, and the section cites two.** The sentence is the orbit of 0, Theorem 4.9. The second pin is Theorem 4.11, page 116. The first card under that sentence is Newton’s method for a line. The card already names One Newton Step. The extra pin makes the section carry two lessons again.

The hint on 4.1.3 still ends “This card does not print the ε.” The lede already said the hint stays closed and the card has no solution. The same apology is on the other hints.

Exercise 1 in 4.3 still opens `(1+i)/2`, which is part (a). Part (b), ratio `1/(2+i)`, stays in the hint. That is the right split. The radius picture is the disk of radius 2, and the card does not say which of 4−i and 2+3i is closer. Leave both.

## Cut

- On a chapter arrival, the film above the chip. The chip and the list are the page. The film follows them.
- On the sequence station, “Exercise 1(a) asks for this limit” and the sentence that sends that limit to the index, when the door was the chapter.
- The gap that lets the previous tick show under the header.
- Theorem 4.11 on section 4.2.
- “This card does not print …” at the end of each chapter hint.

## Add

Nothing. No chip for `1/(2+i)`. No new picture. No second score. No Chapter 5 sections.

The picture chip on a chapter card is 36px tall on the phone. The tick beside it is 44px. The site’s tap is 44px. If a later edit is already touching that link, give the chip the same height. The flags and the kicker are the site’s own small caps. Leave them.

## Another batch

Yes. One batch, then stop. Five cuts, in this order. Chapter 5 stays the sentence it is.

1. **The orbit is the first screen.** From Exercise 5, `c = −2` and the list 0, −2, 2, 2, … are on the screen you land on, with the line that cites Theorem 4.9. The film goes under that list. `c = 0.3` stays in the film. The same order for the other chapter doors: the chip the card named, then the film, if that station has one.

2. **The sequence picture keeps the chapter’s name for it.** Opened from Exercise 3 or Exercise 13, the note calls the terms the disk in Definition 4.1. It does not call them Exercise 1(a), and it does not send the limit to the index.

3. **Go to 4.2 puts 4.2’s title under the header.** The previous tick stays above the window. The same for 4.3 and 4.4.

4. **Section 4.2 cites Theorem 4.9.** Theorem 4.11 leaves the section. One Newton Step keeps its own cite.

5. **The hint stops apologising.** Cut the last sentence that says the card does not print the proof, the count, the orbit, or the ε. The lede already said it.

When those five are done, stop. A Chapter 5 batch that copies this page will be eight more cards pointing at pictures the exponential does not have.

## Book path, batch 3

Branch `cursor/book-chapter-path-df29`, commit `ae5c8a8d`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev, light theme, fresh storage at each width. Laptop 1280×800: `#book`, Walk Chapter 4, every exercise’s hint, every picture and the link back, every tick, Go to 4.2, Go to 4.3, Go to 4.4, a reload on the last card, the book, Chapter 5, one tick checked on the index, `#chapter-1`, and `#chapter-6-6-1`. Phone 390×844, its own storage: `#book`, the chapter menu, the same eight pictures and the same three jumps, a reload, the book, and Chapter 5. No console errors. No sideways scroll at either width (`scrollWidth` matched the window). A few document loads aborted when the hash changed. Nothing 404’d.

## Verdict

The thing we are trying to be able to do is walk Chapter 4 until the four sentences are ours and the eight exercises are done, then see that Chapter 5 is next and still closed. This batch did the five cuts, and that walk is the page. The orbit at `c = −2` is the screen you land on. The sequence note uses the chapter’s name for the picture. Go to 4.2, 4.3, and 4.4 put the title under the header and leave the previous tick above the window. Section 4.2 cites Theorem 4.9. The hints have stopped apologising.

Chapter 4 is done in this shape. This loop should rest.

The shape is not ready for Chapter 5. Chapter 5 is one true sentence: the exponential, the logarithm, and the powers are not drawn. Chapter 4 works because each exercise opens a picture that already exists. Copying the page would point the next chapter’s cards at pictures the exponential does not have. The §5.4 circuit is a different lesson. Leave Chapter 5 closed.

## The five checks

**The orbit is the first screen.** Yes. From Exercise 5 the chip `c = −2` stays pressed, and the list is 0, −2, 2, 2, 2, 2, 2, 2. On the laptop that list runs from 518px to 717px, and the line under it, citing Theorem 4.9 and Exercise 5, ends at 773px, inside an 800px window. The film starts at 839px. On the phone the theorem paragraph, the pressed chip, and the steps through 0, −2, 2, 2 are on the 844px screen. The last steps and the sentence under the list sit just past the fold. The film starts at 1136px. The same order holds on the other doors. The sequence chip and its terms come before the film. One Newton Step shows the five-step table, then the degree-1 line, then the film. On a phone the degree-1 line is the next screen, under the table and above the film.

**The sequence picture keeps the chapter’s name.** Yes. Opened from Exercise 3 or Exercise 13, the note says the terms are the disk in Definition 4.1. On the laptop that note is on the first screen. Opened from `#sequence`, with no chapter token, the same note still says Exercise 1(a) and that the write-up is on the index.

**Go to 4.2 puts the title under the header.** Yes. The header ends at 56px. After the jump, the 4.2 flag starts at 73px and the title “Julia and Mandelbrot Sets” starts at 96px. The tick for Exercise 13 sits at −38px to 6px, above the window. Go to 4.3 and Go to 4.4 do the same, on the laptop and on the phone. Section 4.4 lands as the sentence, Theorems 4.15 and 4.16, and Exercise 6. The previous tick is above the window there too.

**Section 4.2 cites Theorem 4.9.** Yes. The section’s only pin is Theorem 4.9, page 113. Theorem 4.11 is gone from the section. One Newton Step’s tag is still Example 4.7, page 110.

**The hint stops apologising.** Yes, on the seven homework cards. Each hint still names the picture and the theorem, and none of them ends with “this card does not print.” Exercise 6 still ends “This card does not say which of the two points is closer.” That line stays. The card still does not pick 4−i or 2+3i.

## What I could actually do

`#book` opens on “Next is §4.1, Exercise 3. 0 of 8 exercises.” and Walk Chapter 4. The button is on the first screen at both widths. The page under it is eleven chapters. Chapter 4 keeps its four rows. Chapter 5 says the walk is not drawn yet. Chapters 6–11 are a title, a page, and Later. The menu is the eleven chapters. On the phone it covers the exercise, and Chapter 4 is the current row.

Walk opens the chapter with the title on screen. Go to 4.2 is hidden until both 4.1 exercises are ticked. Ticking walks the status from Exercise 3 to Exercise 13, then §4.2 Exercise 3, and on through Exercise 6. The last tick says “Done. 8 of 8 exercises.” and the button says Back to the book. A reload on `#chapter-4-4-4-6` kept all eight ticks and left that card outlined. The book then says Chapter 5 is next and its walk is not drawn yet. The button is Open Chapter 5.

Each picture opens the chip the card names, and the header link returns to that card, outlined, with the card’s top at 144px.

- Exercises 3 and 13 open `(1/2 + i/4)^n`. The moduli fall: 0.559, 0.3125, 0.1747, and on down. The note names Definition 4.1.
- Exercise 4 opens `|z| < 1`. The moduli are 0.5, 0.25, 0.0625, and then 0.
- Exercise 5 opens `c = −2`. The list is the one above.
- Exercise 3 in 4.2 opens the five steps of Example 4.7, from 0.25 + 0.25i to i, and the degree-1 line is the exercise.
- Exercise 1 in 4.3 opens `(1+i)/2`. The partial sums are on the page. Exercise 2 opens `z = 0 in D₂(−i)`, and the note gives `|w| = 1/2`.
- Exercise 6 opens `|z| = 1`. The pile of Σ (z/2)^n climbs toward 2.

One tick on the chapter, Exercise 3, makes the index button say Ticked. The index count is “Ticked 1 of 30.” `#chapter-1` stays on the book and puts Complex Numbers under the header. `#chapter-6-6-1` is “No such place.”

## What clicks

The four sentences are still the right voice, and each section is that sentence, the pin it needs, and the exercises. The orbit is the wonder, and it is now the landing: a pressed chip and a list that sits down at 2. The film has to wait.

The jumps tell the truth about where you are. The title of the section you asked for is the first thing under the header. The tick you just made is gone until you scroll up.

One tick is one memory. The chapter, the reload, and the index agree. Chapter 5 still refuses to be a dossier. The menu on this route is the book.

## What still snags

**Four station notes still mention the index.** The chapter hints stopped. The pictures did not. Under the orbit list, the theorem line ends “The index does not print them.” The degree-1 line ends “The index does not print the count.” The disk’s inside chip says the write-up is on the index. The `(1+i)/2` chip says the index does not print the sum. The list, the count, and the sum are on the page in front of you. The clause points at a second door. It did not stop the walk.

**On a phone, the orbit fills the screen and then one more line.** The theorem, `c = −2`, and 0, −2, 2, 2 are on the first screen. Step 5 is the line the window cuts. The sentence under the list, and the film, are the next flick. That is the list winning the screen.

**Section 4.2’s first card is still Newton’s method for a line.** The sentence above it is the orbit of 0. Exercise 3 is earlier in the section than Exercise 5, and the card already names One Newton Step. Leave the order.

The picture chip on a chapter card is still 36px. The tick beside it is 44px. The site’s tap is 44px. Leave it until a later edit is already touching that link.

The film’s caption peeks at the bottom of the laptop orbit and of the sequence page. The film itself is the next screen.

While you are inside 4.2 the button can still say Go to 4.2. Once the title is under the header, that button is above the window.

## Cut

Nothing that needs another pass through the chapter.

## Add

Nothing. No Chapter 5 sections. No new picture. No second score.

## Another batch

No. The five doors landed. A student can walk the four sentences, open each picture on the chip the exercise named, come back, and reload with the ticks kept. Chapter 5 stays the sentence it is. The loop should rest.

## taste-skill (batch 4)

Branch `cursor/book-chapter-path-df29`, commit `2dc9cff3c8f9cdd72ed1caf775f9543ef06ec1c9`. Used like a MAT 412 student on a local server of that commit, light theme. `#chapter-5` and `#book` at 1280×800, and `#chapter-5` at 390×844. Play through a full sweep, a pause, a drag while the sweep was running, a pull up from the green dot, the right arrow, and reduced motion from a fresh load. The chapter menu on the phone. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

### Verdict

The thing to be able to do is watch the angle go round, then change the real part and see that only the radius moves. That gesture is on the page. Play walks the purple point once around the dashed circle and leaves the real part at 0. A drag during that walk changes the radius, the sentence flips between larger than 1 and smaller than 1, and the angle keeps going.

The page you land on hides it. The picture opens with the ray lying on the real axis, in a square 304px wide, and the sentence has to say that the angle is a clock. Another batch is worth doing. It is the cuts below. After that, stop.

### What I could actually do

`#chapter-5` opens on THE BOOK, the title Chapter 5, and one square. At 1280 the square is 304×304, with its left edge at 304px, in a column about 950px wide. The dashed circle on that square is about 84px across. The claim under it is 17px, two lines, and 603px wide. Play is 44px tall and 70px wide. The title is 36px. The cite is 13px. The kicker, the title, the square, the claim, the button, the cite, and the way back share one left edge.

The opening sentence is “On the imaginary axis the image stays on the unit circle. The angle is the clock.” The real part is 0 and the angle is π. The purple point sits on the left of the dashed circle, on the horizontal axis. The green dot sits on the right of that circle, large enough that it reads as outside the stroke.

Play becomes Pause. Over about eight seconds the angle runs from −π back to π, the real part stays 0, and the sentence stays the unit-circle sentence. Pause held the angle where it was. At the end the button says Play again and the point is back on the left of the axis.

A drag during the sweep, while the button said Pause, from a large radius down toward the origin, left the angle running (−2.59, then −1.96, then −1.48) and set the real part to about −0.80. The sentence became “The radius is e^x, smaller than 1. The angle is still the clock.” A faint purple circle sat inside the dashed one. The green dot stayed on the positive axis.

Pulling upward from the green dot, after the sweep had finished, left the dot on the axis. The real part became about 0.66, the sentence said the radius is larger than 1, and the angle stayed at π, so the ray was the horizontal axis again. The right arrow adds 0.1 to the real part.

Reduced motion, from a fresh load, opens on that same still and the button says Next step. The first step sets the angle to about −0.04, so the purple point sits on the green dot. The second step returns the angle to π and the button says Start again. Those are the only two stills.

On the phone the square is 321px in a 390px window, with 16px margins. The sentence, Play, the line about the logarithm, the cite, and Back to the book sit on the 844px screen. The menu is the eleven chapters and it covers the page. Chapter 5 is the current row.

The book card for Chapter 5 says “Open. The walk through these sections is not drawn yet.” The card has no link. The menu row is the door.

### What clicks

One picture, one button, one sentence that changes when the radius leaves 1. The sweep does the angle. The drag during the sweep does the radius. That is the exponential.

The colours are the course colours, and they sit on the marks. Blue is the axes, orange is the dashed circle and the ray, green is the radius, purple is the point. The button, the title, and the menu stay in ink. The footer colour key stays off this route.

Play, Pause, and Play again match the clock. A second press freezes the picture where it is. The way back is one link. The cite is Howell and Mathews, Chapter 5, page 130.

The phone composition is the one the picture wants. The square fills the width, and the sentence sits under it.

### What gets in the way

**The still hides the angle.** The frame the page opens on, the frame the sweep ends on, and both reduced-motion steps put the ray on the real axis. At the first Next step the purple point lies on the green dot, so the image and the radius mark are one dot. The clock is on screen only while Play is running, for about eight seconds, on a circle 84px across. A drag before Play, and a step, both leave two dots on a line under a sentence about a clock.

**The laptop picture is a stamp.** 304px in a column with room for three of them. The empty sheet beside the square is the rest of the first screen. The sentence is twice as wide as the diagram. The 36px title is the largest thing you can read. The idea is the small circle.

**The drag has no handle.** The cursor on the square is the text cursor. The green dot is the large mark, and a pull off the axis leaves it on the axis. The radius becomes the pointer’s distance from the origin. Dragging around the circle leaves the angle with the clock. The second sentence is the only place that split is said, and that sentence is the same on every frame. At radius 1 the green dot sits outside the dashed stroke, so the opening picture looks as if a point has already left the circle.

**Two lines say the page is empty.** Under the picture: “The logarithm and the powers are not drawn yet.” On the book, the Chapter 5 card says the walk is not drawn yet. The picture is the page. The title is the number Chapter 5. The menu already says Elementary Functions.

The cite, the kicker, and Play stay. The kicker is the one small-caps label. Play is the clock.

### Cut

- The resting frames that hide the ray. Open, a pause, the end of the sweep, and Next step land on a quarter turn you can see, straight up or straight down. The sweep can still pass the two ends, where the point lies on the axis.
- The 38vh cap on the laptop. The square uses the column, and the sentence stays on the first screen. The phone square already uses the width of the phone.
- “The angle is the clock.” The claim is one sentence, and it flips: on the circle, larger than 1, smaller than 1. Write the exponential the way the rest of the book writes it. The green dot is the handle, and it moves along the real axis with the finger.
- Both “not drawn yet” lines. The book card keeps Open, the title, and the page. The line under the picture goes.

### Add

Nothing. No logarithm, no powers, no second plane, no exercise cards, no colour key, no scrubber.

### Another batch

Yes. One batch, then stop. It is the four cuts above, in that order. A §5.1 list of exercises, hung on the picture as it stands, would point the cards at a still that hides the angle. When the frame you land on shows the turn, and the drag moves the green dot, the loop should rest.

## unslop (batch 4)

Branch `cursor/book-chapter-path-df29`, commit `2dc9cff3`. Served this tip locally and used it like a MAT 412 student, light theme, fresh storage. `#chapter-5` at 1280×800 and at 390×844. I dragged the purple point straight up, dragged in toward the origin, put the radius back on the dashed circle, and pressed Play through one lap. I paused, dragged while it was paused, pressed Play again, and dragged while it was turning. On the phone I dragged, pressed Play, and opened the chapter menu. I read the Chapter 5 node on `#book`. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The thing to be able to do is watch e^z. The clock owns the angle. The hand owns the real part, so a drag changes the radius and leaves the angle where the clock left it. The picture already does that.

The page around the picture still reads as a chapter that has not been drawn. The title is “Chapter 5.” The sentence names an axis that is not on the page. A heavier green disc covers the point halfway through the lap. On a laptop the plane is a small ring in a blank field. Another batch is worth doing. It is these cuts. After that, stop.

## What the hand does

Play is one lap, about eight seconds, and the button tells the truth. It opens as Play. While the point is moving it says Pause. At the end it says Play again and the point sits still. The lap starts and ends on the same ray, the negative real axis, and the point goes out through the bottom, the right, and the top. I sampled it every half second. The radius stayed 0 the whole way. Pause froze the angle at about −1.96 and held it. The next Play continued from that angle, through about −1.43 and −1.02, and the button said Pause again. A drag during that second play set the radius to about 1 and the angle kept moving.

A drag does not follow the finger, and that is the lesson. From the resting point I pulled straight up, 110px, and the point did not go up. It slid left along the same horizontal line. The angle stayed at π. The real part went from 0 to about 1.02, and the sentence changed to the larger radius. Dragging in toward the origin set the real part to about −0.68, same angle, and the sentence changed to the smaller radius. A click back at radius 1 restored the unit-circle sentence. While paused, a drag out to the corner kept the angle at about −1.74 and grew the circle. The green mark ran out along the positive real axis. The purple point stayed on its ray.

On the phone the same drag grew the circle, and Play then carried the point around that larger circle. The button is 44px tall. The menu is the eleven chapters, Chapter 5 is the current row, and the drawer covers the page. Nothing scrolls sideways.

The chrome is quiet. No gradient, no glow, no emoji, no badge, no pulsing control. The header mark and the moon are the only icons, and the phone adds the menu button at the same stroke. The colour key stays hidden. The serif title and the sans text are the site’s own. The kicker “The Book” is the shell’s small caps. Leave it.

## What reads as unfinished

**The sentence describes a plane that is not drawn.** At rest the words are “On the imaginary axis the image stays on the unit circle. The angle is the clock.” The point is sitting on the real axis of this plane, on the left side of the dashed circle. There is no second plane, and nothing marks an imaginary axis of z. The sentence is about the input. The eye is on the output. The two radius sentences do name what changed, and they type it `e^x`, with a caret. Both of them end “The angle is still the clock,” which the resting sentence already said.

**The page never says this is the exponential.** The view text is the kicker, “Chapter 5,” the claim, Play, “The logarithm and the powers are not drawn yet,” the source line, and Back to the book. The source line says Howell & Mathews, Complex Analysis, Chapter 5, Elementary Functions, page 130. The menu row, which is the current one, says Elementary Functions. The word exponential is not on the page. “Chapter 5” is what an unbuilt chapter would be called. The line under Play is a placeholder, and on the phone it sits on the first screen.

**The book still says the page is blank.** The Chapter 5 node reads “Open. The walk through these sections is not drawn yet.” The picture is drawn. The status on that visit is still “Next is §4.1, Exercise 3. 0 of 8 exercises,” and the button is still Walk Chapter 4. That status is the unfinished chapter. The node sentence is the one that denies the picture.

**The green disc is the louder mark.** It is 14px. The purple point is 10px, and the green one paints on top. At four seconds the point arrives on the positive real axis and disappears into the green disc. At rest the two discs read as a pair of points on one circle, with the orange ray lying along the blue axis between them. Once the radius leaves 1, the picture is clear: a dashed circle, a larger faint circle, a ray, and the green mark out on the axis. That larger state is the one the green mark earns. The resting state and the middle of the lap are where it gets in the way.

**The plane is phone-sized on the laptop.** At 1280 the square is 304×304, starting at x = 304 in a column 952px wide. That is 38vh of an 800px window. The unit circle is a small ring, and the rest of the column is the paper colour. At 390 the square is 321×321 in a 358px column, so the phone already gives the plane the width. The laptop gives it the same pixels and a blank field.

A drag also puts the focus ring around the square, a dark outline. That is the ring. Leave it.

## Cut

- The imaginary-axis sentence. The resting line should say what is on the page: the point stays on the dashed circle, and a drag changes the radius. “The angle is the clock” belongs on that line. The two radius lines keep larger and smaller, without the caret and without repeating the clock.
- “The logarithm and the powers are not drawn yet.”
- On the book, “The walk through these sections is not drawn yet.” The node can stay Open. The title on the chapter page should name the exponential. “Chapter 5” does not.
- The green disc’s weight. The purple point stays the mark the clock moves, painted above the radius mark, and the radius mark is the smaller one. The circle already says the radius.
- The 304px cap on the laptop. The plane should use the column the way the phone already uses the width, with the sentence and Play still on that screen.

## Add

Nothing. No exercise cards, no chips, no scrubber, no second plane, no colour-key paragraph, no logarithm, no powers.

## Another batch

Yes. One batch, then stop. It is the five cuts above. The gesture is already the one a student came for: Play turns the point, a drag changes only the radius, Pause holds the angle, and the next Play continues it. A batch that adds §5.1 exercises, or that starts the logarithm, will hang new sentences on a picture whose own sentence still names an axis the drawing does not have.

## appllama (batch 4)

Branch `cursor/book-chapter-path-df29`, commit `2dc9cff3`. Used like a MAT 412 student on a phone and on a laptop. The page was a local server of that commit. The picture, the player, and the stylesheet on https://book-preview.complexanalysis.pages.dev are the same files. Headless Chrome, light and dark. `#chapter-5` at 1280×800 and at 390×844. One full turn, a pause in the middle, a radius drag while the turn kept going, drags along both axes, a swing off the purple point, a tap in the middle, a tap in the corner, reduced motion, and the chapter menu. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The clock earns its place. Play sends the purple point once around the circle, about eight seconds, and the radius stays put. Pause leaves it there. The next press continues that turn. A drag during the turn changes the radius, and the angle keeps moving. That is the exponential. Time turns the angle. The finger sets the radius.

The drag does not carry the finger. A touch sets the radius from the finger’s distance to the center, so a tap jumps the circle, and a swing that starts on the purple point leaves that point on its ray. Reduced motion steps between the two real-axis pictures, so the angle the clock is there to show never appears. Another batch is worth doing. It is the grab, the steps, and the sentence. Then stop. The clock stays. The section list stays off this page.

## The turn

At rest the real part is 0 and the angle is π. The purple point sits on the left of the dashed circle. The green point sits on the right. The orange ray runs from the center to the purple point. The sentence is “On the imaginary axis the image stays on the unit circle. The angle is the clock.” The button says Play. A paused page scheduled 0 frames in 700ms, at both widths, and the same under reduced motion.

Play moves the point about 1px. The angle goes from π to just past −π, which is the same place on the circle, and the button says Pause. From there the angle climbs steadily, about 0.79 radians a second, and the real part stays 0. The sentence stays the opening sentence for the whole turn. At eight seconds the angle is π again, the point is back on the left, and the button says Play again.

A pause at angle −2.20 puts the label back to Play. Four hundred milliseconds later the angle is still −2.20. The next press continues. While that turn is running, a drag along the positive axis takes the real part through 0, 0.18, 0.34, 0.47, 0.59, 0.69, 0.79, 0.88. During the drag the angle moves from −2.04 to −1.94, and a third of a second later it is −1.47. The button stays Pause. The sentence changes to “The radius is e^x, larger than 1. The angle is still the clock.” The green dot stays on the finger for that drag, 0px off.

On this machine the turn is a steady 60 frames a second. In 1.5 seconds of Play there were 91 frames, median 16.7ms, 95th percentile 16.8ms, none over 20ms, and no long task. The same numbers with the CPU slowed to 4×. The paint is a few marks on the circle. There is nothing here to speed up.

## The finger

Along the positive axis the green dot follows. Thirteen samples, mean miss 0.2px, worst miss 2.1px, and the angle stays put. On the phone, at the opening angle, a drag out along the negative axis keeps the purple dot on the finger, 0px off, angle held at π, real part from 0 to 0.79. Letting go leaves the number where it is. A quarter of a second later the real part and the angle are the same. The radius stays where the finger let go.

A swing is a different gesture. The finger starts on the purple point and walks a quarter turn around that circle. The real part stays 1.04 and the angle stays −1.47. The purple point ends 169px from the finger.

A tap that misses the current radius jumps. A press at plane point (2, 2), with no move, takes the real part from −0.51 to 1.04. A press on the center takes it from 0.79 to −1.2, the smallest circle the picture allows. The corner clamps at 1.2, and the green dot stops on the axis while the finger is 156px away, up in the corner.

The green dot is about 15px across on the phone. The purple dot is about 11px. The stage is 321px square, and every part of it sets the radius. The cursor is the arrow. Nothing in the sentence says drag.

Crossing the unit circle, the real part sits at 0 while the finger’s distance passes 0.98, 1.02, and 1.06, and the dashed circle’s stroke thickens. The stick is inside that 2px miss. It is how the “on the circle” sentence becomes a place the finger can hold. Leave it.

The arrow keys change the real part by 0.1 and leave the angle. The page does not say so. The drag sentence is the one to fix. A keyboard paragraph would be a second instruction.

## What already feels like the phone

One button, and the words change with the state: Play, Pause, Play again. Under reduced motion they are Next step and Start again. The button is 44px tall. On the phone the picture, the sentence, Play, the one line about the logarithm, the source, and Back to the book are on the first screen. The back link ends at 817px in an 844px window. The menu is the eleven chapters. Elementary Functions is the current row. The drawer covers the picture, which is what this menu does. Light and dark both keep the blue axes, the orange ray, the green point, and the purple point. In the dark the sentence is rgb(233, 237, 245) on rgb(13, 18, 28).

On the laptop the same picture is 304px in a column 937px wide. The phone already gives the circle the width of the page. The laptop leaves it small, on the left, with the rest of the column empty. Play still sits on the first screen, ending at 595px in an 800px window.

At angle 0 the purple point lands on the green point. The reduced-motion step to −0.04 is that stack: on the phone the mark jumps from x = 132 to x = 221, and the two dots become one. The other step puts them on opposite ends of the circle. Both steps are on the horizontal axis.

## Cut

- The jump on contact. The finger picks up the radius the picture already has. The green dot is that handle, and it stays under the finger along the axis. A press off the dot leaves the radius alone. Give the dot a 44px target. The purple point stays the point the clock moves.
- The two-step angle. Next step should land on the bottom, the right, the top, and the left of the circle. The step still does not play.
- The opening sentence’s “imaginary axis,” and “the angle is the clock” while the picture is sitting still. The point is on the left of the unit circle. The two radius sentences already change when the circle grows. They can stay.
- The 38vh cap on the wide page. Let the circle use more of the column. Keep Play on the first screen.

## Add

Nothing. No slider, no scrubber, no speed control, no second clock, no section list, no chips.

## Another batch

Yes. One batch, then stop. Four fixes, in this order.

1. **The finger picks up the radius.** A press on the green dot keeps the value until the finger moves, and the dot then stays under the finger. A press anywhere else changes nothing. The dot is a 44px target. A drag during Play still leaves the angle running.

2. **Next step walks the circle.** Bottom, right, top, left. The purple point comes off the green dot, and it comes off the horizontal axis. No continuous motion on that setting.

3. **The sentence names this frame.** At rest it says the point is on the unit circle, on the left. The radius lines stay the lines that change when the circle grows or shrinks.

4. **The wide page gets the circle.** Drop the cap that holds the picture at 304px in a 937px column. Play stays on the first screen at 1280×800 and at 390×844.

When those four are done, stop. The turn is already the lesson, and it already runs at a steady 60 frames a second. A batch that adds the §5.1 exercises, a scrubber, or a second picture is the packet again.

## taste-skill (batch 5)

Branch `cursor/book-chapter-path-df29`, commit `5375bcaf`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev, light and dark. `#chapter-5` at 1280×800 and at 390×844. Play through the bottom of the circle and through the right-hand point, a pause, a drag of the green dot while the turn kept going, a press in the middle of the plane, a press on the green dot with no move, a drag out and a drag in. Reduced motion through the four steps. The chapter menu on the phone. The Chapter 5 node on `#book`, and the book again after the eight Chapter 4 ticks. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

### Verdict

The thing to be able to do is watch the angle go round, then change the real part and see that only the radius moves. That gesture is on the page. Play walks the purple point once around the dashed circle. A drag of the green dot changes the radius and leaves the angle with the clock. Next step lands on the bottom, the right, the top, and the left.

The sentence under the picture names the frame you land on, and it stays after the point has left. At the bottom, at the top, and on the right, the line still says the point sits on the left of the real axis. Another batch is worth doing. It is that sentence. After that, stop.

### What I could actually do

`#chapter-5` opens on THE BOOK, the title Chapter 5. The exponential, and one square. The title is one line at both widths, 36px on the laptop and 26px on the phone. The kicker, the title, the square, the claim, Play, the cite, and the way back share one left edge.

At 1280 the square is 480×480, from x = 304, in a column whose title runs 952px. The dashed circle is 133px across. Play is 44px tall and ends at 745px in an 800px window. The cite ends at 795px. Back to the book starts at 828px. At rest the real part is 0 and the angle is π. The purple point sits on the left of the dashed circle. The green dot sits on the right, 12px across. The sentence is “The point sits on the left of the unit circle, on the real axis.”

Play becomes Pause. At two seconds the angle is −π/2 and the purple point is at the bottom of the circle. The sentence is still the left-hand sentence. At four seconds the angle is about 0 and the purple point sits on the green dot, on the right. The sentence is still the left-hand sentence. Pause held the angle at about 0.10, and four hundred milliseconds later it was the same number. The next press continued. A drag during that turn, while the button still said Pause, took the real part from 0 to about 0.79 and the angle from 0.34 to 0.82. The sentence became “The radius is e^x, larger than 1,” with e^x set as math. A press in the middle of the plane left the real part at 0.79 while the angle kept going, on to 0.98.

From a fresh rest, a press on the green dot with no movement kept the real part at 0. A drag to the right set it to about 0.86, the angle stayed at π, and the sentence said the radius is larger than 1. A drag inward clamped the real part at −1.2, the angle stayed at π, and the sentence said the radius is smaller than 1. The same math is on the phone.

Reduced motion opens on the left-hand still and the button says Next step. The four presses land on −π/2, 0, π/2, and π. The button becomes Start again. It never says Pause. The sentence stays the left-hand sentence on every one of those stills, including the bottom, the right, and the top.

On the phone the square is 358px in a 390px window, with 16px margins. The dashed circle is 99px across. The green dot is 9px across. The claim wraps to two lines. Play, the cite, and Back to the book sit on the 844px screen. The way back ends at 762px. The menu is the eleven chapters, Chapter 5 is the current row, and the drawer covers the page. A drag of the green dot grew the circle, and the real part went to about 0.88.

In the dark the sentence is rgb(233, 237, 245) on rgb(13, 18, 28). The axes stay blue, the circle and the ray stay orange, the handle stays green, and the point stays purple. The same sentences, the same Play and Pause, and the same layout.

The book card for Chapter 5 says Open, Elementary Functions, Page 130. The fresh status is still “Next is §4.1, Exercise 3. 0 of 8 exercises.” After the eight ticks the status is “Done. 8 of 8 exercises. Chapter 5 is next.” and the button is Open Chapter 5.

### What clicks

One picture, one button, one drag. The clock owns the angle. The green dot owns the radius. A press off the dot leaves the radius alone. A press on it keeps the value until the finger moves, and then the dot stays under the finger along the real axis. A drag during the turn leaves the angle running.

The colours are the course colours, and they sit on the marks in light and in dark. The button tells the truth: Play, Pause, Play again, and under reduced motion Next step and Start again. The way back is one link. The cite is Howell and Mathews, Chapter 5, Elementary Functions, page 130.

The title names the exponential. The line under the picture is gone. The book card keeps Open, the title, and the page. The finished chapter says Chapter 5 is next, and it stops there.

The phone composition is the one the picture wants. The square fills the width, and the sentence sits under it. The laptop square is the height that leaves Play on the first screen.

### What gets in the way

**The unit-circle sentence is one frame.** It is true at rest, and at the end of the sweep, where the point sits on the left of the real axis. Play leaves that frame in the first second, and the words stay. Next step’s first still is the bottom of the circle, and the words still say left, on the real axis. The right-hand still is the same sentence with the point on the right. The two radius sentences are the ones that flip, and they flip honestly. The unit-circle sentence does not.

On the right-hand still the purple point covers the green dot. The drag still starts on that spot. The purple point is the mark the clock moves. Leave the stacking.

The laptop square is 480px of a 952px column, so a field of the paper colour sits to its right. That is the height budget that keeps Play on the first screen. Leave the size.

A drag draws the focus ring around the square. That is the ring. Leave it. The kicker, the blue axes, and the four teaching colours are the shell. Leave them.

### Cut

- “On the left” and “on the real axis.” While the radius is 1 the sentence has to be true at the bottom, the right, and the top, and at the frame you land on. “The point stays on the unit circle.” The two radius sentences stay, with the math.

### Add

Nothing. No logarithm, no powers, no exercise cards, no second plane, no colour key, no scrubber.

### Another batch

Yes. One batch, then stop. It is the one cut above. The handle, the quarter-turn steps, the title, and the book card have landed. Something real is left, and it is the sentence: for the whole turn it names a frame the point has left. A §5.1 list of exercises, hung on this picture, would point the cards at a line that is false for three of the four steps.

## appllama (batch 5)

Branch `cursor/book-chapter-path-df29`, commit `5375bcaf`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5. The live picture is that commit. Headless Chrome, light and dark, at 390×844 and at 1280×800. On the phone the finger was a touch. On the laptop it was the mouse. A press on the green dot with no move, a 2px nudge, a press off the dot, a press on the rim of the target, a drag along the axis, a drag off the axis, a drag that starts on the purple point, and a drag during Play. Reduced motion through the four steps and once around again, in both themes at both widths. One full turn, a pause, and a continue, and the same turn with the CPU slowed to 4×. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The finger picks up the radius the picture already has. Next step lands on the bottom, the right, the top, and the left, and it does not play. The turn holds a steady 60 frames a second, on the phone and on the laptop, and again at 4×. Those three are done.

The sentence is not. It says the point sits on the left, on the real axis, while Next step is showing the bottom. It says that for the whole turn. Another batch is worth doing. It is that sentence. Then stop.

## The finger

At rest the real part is 0 and the angle is π. The purple point is on the left of the dashed circle. The green dot is on the right. A press on the green dot, held, leaves both numbers where they are. A 2px nudge leaves them too. Letting go leaves them. A press 40px off the dot, and a drag that starts on the purple point, change nothing.

The target is a 44px circle around a smaller mark. On the phone the green dot is 9px across and the purple point is 12px. On the laptop they are 12px and 16px. A press 18px from the center picks the dot up. A press 26px from the center does not. The first slip inside that circle keeps the radius. The move after it puts the center of the dot on the finger. From there, along the axis, the miss is 0. One sample sat 2px off, at the moment the real part landed on 0. That is the same stick as last batch. Leave it.

A drag straight up leaves the dot on the axis, at the finger’s x. The page does not scroll, and the angle stays at π. The radius is the real part. The finger’s height is not a second handle.

During Play the button says Pause and the angle keeps moving while the dot follows the finger along the axis. On the phone the real part stops at 1.2 and the dot stops 3px short of a finger that has left the square. The angle is still moving. Pause puts the label back to Play and the angle stays. Four hundred milliseconds later it is the same angle.

## The quarter turn

Reduced motion opens on Next step, on the left, angle π. Idle, the page scheduled 0 frames in 400ms.

The four presses land on:

- the bottom, angle −π/2, the purple point 50px below the center on the phone and 67px below it on the laptop
- the right, angle 0, the purple point on the green dot, 0px apart
- the top, angle π/2
- the left, angle π, and the button says Start again

Each press scheduled 0 frames. Start again returns to the bottom. The same four places, in light and in dark, at both widths. The right-hand still is one dot because radius 1 at angle 0 is the green dot. That is the place. Leave it.

The sentence on all four stills, and on Start again, is “The point sits on the left of the unit circle, on the real axis.” On the bottom and the top the point is on the imaginary axis. On the right it is on the real axis, on the other side.

## The clock

Play moves the point about 1px and the angle goes from π to −π, the same place on the circle. The button says Pause. From there the angle climbs by about 0.013 a frame, the real part stays 0, and the sentence stays the left-axis sentence. A full turn is 481 frames, median 16.7ms, 95th percentile 16.8ms, none over 20ms, no long task, and the longest paint was 0.2ms. The button says Play again and the point is back on the left.

The same 1.5 seconds on the laptop, and on the phone with the CPU slowed to 4×, are 90 and 91 frames, median 16.7ms, none over 20ms. At 4× the longest paint was 1.2ms. A paused picture scheduled nothing in 500ms. Pause holds the angle. The next press says Pause and continues from that angle.

A drag off the circle writes the radius as \(e^{x}\), larger than 1, and a drag the other way writes smaller than 1. In the dark those words are the light text on the dark page. The caret is gone.

## The page around it

On the phone the square is 358px in the 390px window. The dashed circle is 99px across. Play ends at 637px, and Back to the book ends at 762px, inside the 844px screen. The title is “Chapter 5. The exponential,” on one line.

On the laptop the square is 480px, up from the old 304px, starting at x = 304 in a column about 1000px wide. The circle is 133px across. Play ends at 745px in the 800px window. The cite ends at 795px. Back to the book ends at 851px, one line under the window. The square is as tall as this screen can hold and still keep Play on it. The paper to the right of the square is the rest of the column.

The book’s Chapter 5 row says Open, Elementary Functions, page 130. The blank-walk line is gone. The status on a fresh visit is still the Chapter 4 walk.

## Cut

- “On the left” and “on the real axis” in the sentence that stays up for the whole turn. That line is true on the resting frame and at the end. It is false at the bottom, the right, and the top, and it is false while Play is moving the point. On the unit circle, say the point is on the unit circle. Name the left only on the frame where the point is on the left. The two radius sentences stay.

## Add

Nothing. No slider, no scrubber, no spring, no second clock, no section list, no chips.

## Another batch

Yes. One cut, then stop. The handle, the four stills, and the frame clock are the lesson, and they already hold. A batch that adds the §5.1 exercises, or that starts the logarithm, will hang new cards on a sentence that calls the bottom of the circle the left.

## unslop (batch 5)

Branch `cursor/book-chapter-path-df29`, commit `5375bcaf`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev, light and dark. `#chapter-5` at 1280×800 and at 390×844. From the still: one full lap, a pause at the bottom, Play again from there, and a drag while that lap was running. A press on the green dot, a press 18px off it, a press 30px off it, a pull straight up, and a drag along the axis. Reduced motion from a fresh load, through all four steps. The chapter menu on the phone. The Chapter 5 node on `#book`, and the book again after the eight Chapter 4 ticks. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The cuts from the last note landed, and the picture is the page. The title is Chapter 5. The exponential. The blank lines are gone. The plane is 480px on the laptop and the width of the phone, and Play is on the first screen in both. The green dot is the smaller mark, painted under the purple point, and it is the handle. A press keeps the radius until the finger moves, and then the dot stays under the finger along the axis. A press off the dot leaves the radius. Play turns the point. Pause holds the angle. The next Play continues it. A drag during that turn changes only the radius. Next step lands on the bottom, the right, the top, and the left.

One sentence is still wrong, and it is wrong on the frames you can hold. At rest it says the point sits on the left of the unit circle, on the real axis, and that is the still. The same line stays up for the whole lap, for a pause at the bottom, and for every Next step, including the right, where the point is sitting on the green dot. Another batch is worth doing. It is that sentence. After that, stop.

## What the hand does

Play is one lap, about eight seconds. The button opens as Play, says Pause while the point moves, and says Play again when the point is back on the left. The real part stays 0. The angle passed about −2.83, −1.57, 0, and 1.57, and finished at π. Pause at the bottom left the angle at −1.57. Half a second later it was the same angle, and the button said Play. The next press said Pause, and the angle had moved to about −1.27. A drag during that second turn set the real part to about 0.85, the green dot sat on the finger, and the angle kept going, to about −0.90. The sentence changed to the larger radius.

A press in the middle of the square, and a press on the purple point, leave the radius at 0. A press 30px above the green dot leaves it. A press 18px to the right of the dot, then a move, puts the dot on the finger. Both were at x = 671, and the angle stayed at π. A pull straight up, 90px, leaves the dot on the axis and leaves the radius. Dragging left along the axis crosses the dashed circle. The sentence changes to the smaller radius, and back when the finger returns. On the phone the same drag puts the dot on the finger, both at x = 285, and the angle stays at π. The green dot is 12px on the laptop and 9px on the phone. The purple point is 16px and 12px. The purple one is painted on top.

Reduced motion opens on the still, and the button says Next step. The steps are the bottom, the right, the top, and the left. The button becomes Start again. At the right, the two dots share one center, and the purple point covers the green dot.

The chrome is quiet in both themes. Light paper is #f6f3ec. Dark paper is #0d121c, and the sentence on it is #e9edf5. Blue, orange, green, and purple stay on the axes, the ray and the dashed circle, the radius mark, and the point. In the dark those are #62adf2, #ff9d5c, #3fd0a0, and #e48fd2. The header mark and the theme button are the icons. The phone adds the menu button at the same stroke. The menu is the eleven chapters. Chapter 5 is the current row, and the drawer covers the page. The kicker is the site’s small caps. It stays.

## What reads as the page

The title is “Chapter 5. The exponential.” The line that said the logarithm and the powers were not drawn is gone. The book node is Open, Elementary Functions, Page 130. With the eight ticks stored, the status is “Done. 8 of 8 exercises. Chapter 5 is next.” and the button is Open Chapter 5. The radius sentences set \(e^{x}\) as math, and they stop at larger than 1 and smaller than 1.

On the laptop the square is 480×480, from x = 304 to 784, in a column that runs to 1256. Play ends at 745 in an 800px window. The cite ends at 795. Back to the book starts at 828. On the phone the square is 358×358. Play ends at 637. Back to the book ends at 762 in an 844px window. The footer’s first line is the next thing on that screen. The dashed circle is about 133px across on the laptop, inside a window that runs to a radius of about 3.6, so a large radius still fits.

## What is still false

**The sentence names the still, and then it stays.** At rest the words match the picture. Once the point leaves the left, they do not. At the bottom of the lap the point is under the origin, and the line still says it sits on the left, on the real axis. The same line is up at the right, where the point covers the green dot, and at the top. Pause at the bottom leaves that line over a point that is on the downward ray. Every Next step shows it too. The two radius sentences tell the truth about the circle growing and shrinking. The unit-circle line tells the truth only at the start and the end.

The green dot is the handle, and the line names the purple point. On the phone the handle is 9px, inside a 44px grab. A press that misses it leaves the picture alone, which is the right grab. A student who reads the line has the left-hand point, and has not been told that the green dot is the drag.

## Cut

- The unit-circle line, so it is true on every frame that shows it. While the radius is 1, the point is on the dashed circle. That covers the lap, a pause in the middle, and each Next step. “On the left, on the real axis” belongs on that line only while the point is there. The same line says the green dot is the drag. The two radius lines stay, math included.

## Add

Nothing. No logarithm, no powers, no exercise cards, no second plane, no scrubber, no colour key. “The angle is the clock” stays off the line. It would be true on every frame.

The paper to the right of the 480px square stays. A square the width of the column would put Play below the window. The phone already gives the plane the width. The green dot staying hidden under the purple point at the right-hand quarter stays too. Those two marks are the same point, and the purple one is the one the clock moves.

## Another batch

Yes. One batch, then stop. It is that one line.

The gesture is the one a student came for, and the page around it is the page. When the line you can read at the bottom, the right, and the top is true of those frames, the loop should rest. A batch that adds the §5.1 exercises will hang the cards on a sentence that still says the point is on the left.

Something real is left, and it is that sentence. The rest of the last note is on the page. After this line, nothing real is left.

## taste-skill (batch 6)

Branch `cursor/book-chapter-path-df29`, commit `6071a5a`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5, light and dark. The live picture, the walk, and the stylesheet match this commit. `#chapter-5` at 1280×800 and at 390×844. From the still: a drag of the green dot out and a drag in, Play while that radius held, reduced motion through the four steps from a fresh load, the Exercise 1 hint, the Exercise 2 card, and a tick of Exercise 2. `#chapter-5-5-1-1` opens the picture at 0. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

### Verdict

The picture still does the exponential, and the sentence under it follows the point: left, bottom, right, top. The walk under the picture is the part that is still wrong. At 1280 the claim and Play sit below the first screen. The strip blank names a figure the square does not draw. Exercise 2 is a paragraph about that figure, and its blank is already filled. Four empty Later cards close the page.

Another batch is worth doing. It is the four cuts below. After that, stop.

### What I could actually do

`#chapter-5` opens on THE BOOK, the title Chapter 5. The exponential, a grey line about blanks, a bar that says “Next is §5.1, Exercise 1, page 135. 0 of 2 exercises,” and the square.

At 1280, in light and in dark, the square is 480×480 and its bottom is at 811 in an 800px window. The claim starts at 819: “The point sits on the left of the unit circle, on the real axis.” Play is 44px tall and runs from 853 to 897. The first screen ends on the lower axis.

On the phone the square is 358×358. The claim wraps to two lines and ends at 790. Play ends at 842 in an 844px window. The walk starts under that.

A drag of the green dot to the right set the real part to about 0.79, left the angle at π, and the claim and the modulus blank both said the radius is \(e^{x}\), larger than 1. A drag inward clamped the real part at −1.2 and both lines said smaller than 1. The strip blank stayed empty while the point was on the axis. Play then kept that small radius, the button said Pause, and the angle kept moving. Once the point left the axis the strip blank filled with \(e^{x}\).

Reduced motion, from a fresh load, radius 1, button Next step:

- The left. The modulus blank is empty. The strip blank is empty. Exercise 2 reads “land together at −1” and Tick is live.
- The bottom. The claim says the point sits on the bottom of the unit circle. The strip blank fills with \(e^{x}\). Exercise 2’s blank is empty and its Tick is off.
- The right. The claim says the right-hand point. Exercise 1 fills with 1 and Tick wakes. The strip blank is empty.
- The top. The strip blank fills with \(e^{x}\) again.
- The left, and the button says Start again. Exercise 2 fills again. The button never says Pause.

`#chapter-5-5-1-1` opens at real part 0 and angle 0. The claim says the right-hand point, Exercise 1 is filled with 1, and the page is scrolled to that card. Ticking Exercise 2 on the left-hand still writes `5.1.2` into `mv:progress.test2`, and the status becomes “Next is §5.1, Exercise 1, page 135. 1 of 2 exercises.”

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The empty blank’s line is that same light ink. The axes stay blue, the circle and the ray stay orange, the handle stays green, and the point stays purple.

### What clicks

The claim names the frame it is on. The two radius sentences still say larger and smaller, with the math. A drag of the green dot is what fills the modulus blank, and that blank stays empty on the unit circle.

Exercise 1’s blank stays empty until the point is the right-hand point of the unit circle, and then it says 1. Exercise 2’s blank is empty at the bottom, the right, and the top, and it fills on the left. The hint stays closed until you ask. Tick is 44px. The tick that is live is the one that reaches the shared store.

The phone gives the square the width of the page, and Play is on that screen. The cite under the walk is Howell and Mathews, Chapter 5, Elementary Functions, page 130.

### What gets in the way

**The first screen lost the sentence and the button.** The lede is two lines on the laptop and three on the phone. The Next bar is another row. That height puts the square’s bottom at 811 and Play at 853. On the phone the same rows leave Play 2px above the edge of the window.

**The strip blank describes a picture that is not on the page.** “A vertical segment in the strip lands on the circle of radius” fills at the bottom and at the top, with \(e^{x}\). The square is one point. The idea line above the blanks already says the modulus is \(e^{x}\), and the next line is “The modulus is” with an empty rule under the answer.

**Exercise 2 is Figure 5.2’s shading.** The card quotes the lighter shading, the circle \(s_{1}^{*}\), and the rays \(r_{1}\), \(r_{2}\), and \(r_{3}\). Those marks are not on this square. The blank is part (c) only, and on the frame the page opens on, the words “land together at −1” are already written and Tick is live. Exercise 1’s hint says the blank waits until the picture is at 0. The page opens with the real part at 0, on the left, and that blank is empty there. The right-hand point is the one that fills it.

**Four Later cards.** 5.2, 5.3, 5.4, and 5.5 are the same empty box: a small-caps Later, a title, and a page, 119px each, 522px together on the laptop. The cite and Back to the book sit under them.

The hint button stretches with the card, 884px on the laptop and 290px on the phone. That is the card. The kicker, the four colours, and the 480px square stay. The paper to the right of the square is the height that keeps Play on the screen once the rows above the square are gone.

### Cut

- The rows above the square. The claim and Play are on the first screen at 1280×800, and Play has air under it at 390×844. The Next line sits with the walk.
- The strip blank. The idea stops at the identity. The modulus blank is the first line that names \(e^{x}\), and it fills when the radius leaves 1, with larger and smaller.
- Exercise 2’s shading, \(s_{1}^{*}\), and \(r_{1}\), \(r_{2}\), \(r_{3}\). The card is part (c). The blank keeps filling on the left, including the frame the page opens on, because that frame is the answer. Exercise 1’s hint names the right-hand point of the unit circle.
- The four Later cards on this page. The walk ends at the cite and Back to the book.

### Add

Nothing. No logarithm, no powers, no second plane, no scrubber, no colour key.

### Another batch

Yes. One batch, then stop. It is the four cuts above, in that order.

The clock, the handle, and the sentence that follows the point are on the page. Something real is left, and it is the walk under the picture: the first screen, the strip blank, Exercise 2’s figure, and the Later cards. After those four, nothing real is left.

## unslop (batch 6)

Branch `cursor/book-chapter-path-df29`, commit `6071a5a3`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev, light and dark. `#chapter-5` at 1280×800 and at 390×844. From the still: a second and a half of Play, a pause, and the angle held. A drag of the green dot out along the axis. Reduced motion through the four steps. The Exercise 1 hash. A tick on Exercise 2 with two Chapter 4 ticks already stored. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

The shell stays. The kicker, the four teaching colours, the uppercase flags, and the card's full-width hint button are the book path. The picture is the one bright thing on the page.

## Verdict

The sentence from the last note is true on the frames you can hold. At rest the point sits on the left of the unit circle, on the real axis. A second and a half into Play, with the angle near −1.96, the line says the point sits on the unit circle. Pause puts the button back to Play and the angle stays. Next step lands on the bottom, the right, the top, and the left, and the line names each of those. A drag out grows the circle, the claim says the radius is \(e^{x}\), larger than 1, and the angle stays on the axis.

The walk under the picture is the new page. On the laptop the status row pushes the sentence and Play below the window. The second blank talks about a vertical segment in a strip, and it fills while the point is on the circle. Exercise 2 prints the shading and the three rays from Figure 5.2, and the answer to the one part the picture can check is already written. Exercise 1's hint talks about the blank. Another batch is worth doing. It is the four cuts below. After that, stop.

## What the hand does

Play says Pause while the point moves. At about a second and a half the real part is still 0, the angle is about −1.96, and the sentence is "The point sits on the unit circle." Pause says Play. Four hundred milliseconds later the angle is the same number.

Reduced motion opens on Next step, on the left. The four presses land on the bottom, the right, the top, and the left. The button says Next step through the four presses, and Start again on the left. On the bottom the sentence is the bottom of the unit circle. On the right it is the right of the unit circle, on the real axis, and Exercise 1's blank reads \(\exp(0)\) is 1, with Tick ready. On the top the sentence is the top. On the left it is the resting sentence again, and Exercise 2's blank reads that the images of \(\pm i\pi\) land together at −1, with Tick ready.

A drag of the green dot to the right, on the phone, sets the real part to about 0.88 and leaves the angle at π. The claim says the radius is \(e^{x}\), larger than 1. The modulus blank says the modulus is \(e^{x}\), larger than 1. The segment blank stays empty on that axis.

`#chapter-5-5-1-1` opens at the right-hand point, real part 0, angle 0. The claim names the right of the unit circle. Exercise 1's blank is 1 and Tick is ready. The card is scrolled to the top of the phone, and the picture is above the window.

Ticking Exercise 2 writes `5.1.2` into `mv:progress.test2` beside `4.1.3` and `4.2.5`. The status becomes "Next is §5.1, Exercise 1, page 135. 1 of 2 exercises." Exercise 1's Tick stays disabled on the left-hand frame.

## What reads as the page

The title is "Chapter 5. The exponential." The lede is "Section 5.1. A blank fills when the picture makes it true. The hint stays closed until you ask." Hints open on ask and the button goes away. The cite on each card is Howell & Mathews, Complex Analysis, the exercise, page 135, CC BY 4.0. The idea line is Identity (5.1), page 132, and the two read links are Definition 5.1, page 130, and Figure 5.2, page 133. Sections 5.2 through 5.5 are Later, with their pages. The chrome is quiet in both themes. Light paper is #f6f3ec. Dark paper is #0d121c. Blue, orange, green, and purple stay on the axes, the ray and the dashed circle, the radius mark, and the point.

On the phone the square is 358×358. The claim ends at 790 and Play ends at 842 in the 844px window. Play is 44px tall. The cite and Back to the book are the next screen. The hint button is 290px in a 324px card, the card's own stretch.

On the laptop the square is 480×480, from x = 304, y = 331, so its bottom is at 811. The claim starts at 819. Play starts at 853. The window is 800. The status row, "Next is §5.1, Exercise 1, page 135. 0 of 2 exercises.", sits in a card between the lede and the square. The same clip in the dark.

## What is still false

**The second blank names a strip.** It reads "A vertical segment in the strip lands on the circle of radius." During Play, at angle −1.96, and on the bottom and the top, it fills with \(e^{x}\). The claim on those frames is about the point on the circle. The modulus blank stays empty on those frames. Figure 5.2 is already the link under the idea.

**Exercise 2 is the figure's other two questions.** The card quotes the shading in the w plane, the empty disk inside \(s_1^*\), and the angles of \(r_1\), \(r_2\), and \(r_3\). The picture is one point. The blank under that paragraph is already full on the frame the page opens on: "The images of \(\pm i\pi\) land together at −1." Tick is ready before you move. That sentence is true of the left-hand point. The shading and the rays are the rest of the card.

**Exercise 1's hint talks about the blank.** "Definition 5.1, page 130, is the series for \(e^{z}\)." That sentence is the hint. The next sentence says the blank stays empty until the picture is at 0. The right-hand point is that 0, and Next step's second still is where the blank fills.

## Cut

- The status row between the lede and the square. On the 1280×800 screen the sentence and Play sit on the first screen, as they did. The phone already has them, with Play ending at 842. The status sits with the walk.
- "A vertical segment in the strip lands on the circle of radius." The modulus blank stays. It fills when the radius leaves 1, and it matches the claim, with the word modulus.
- Exercise 2's card, down to part (c): where the images of \(\pm i\pi\) are. The blank stays "land together at −1", filled on the left-hand frame, where that is the point. The hint keeps the strip, \(-\pi < y \le \pi\), and says the two ends are the left-hand point.
- Exercise 1's second hint sentence. The series sentence stays. The hint names the right-hand point of the unit circle as \(z = 0\).

## Add

Nothing. No logarithm, no powers, no third exercise, no second plane, no scrubber. The Later rows stay titles. The kicker, the flags, and the four colours stay.

`#chapter-5-5-1-1` scrolls the card to the top of the phone and leaves the picture above the window, with the blank already reading 1. The page a student opens is `#chapter-5`, where that blank is empty until the point is on the right. Leave the hash. If that scroll is touched, the picture stays on screen.

## Another batch

Yes. One batch, then stop. It is the four cuts above.

The gesture is the one a student came for, and the sentence now follows the point. When the laptop shows Play, the segment line is gone, and Exercise 2 asks the question the left-hand point answers, the loop should rest. Sections 5.2 through 5.5 stay titles.

Something real is left, and it is those four. The rest of the last note is on the page.

## appllama (batch 6)

Branch `cursor/book-chapter-path-df29`, commit `6071a5a`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5. The live walk is that commit. Headless Chrome, light and dark, at 390×844 and at 1280×800. On the phone the finger was a touch. On the laptop it was the mouse. A press on the green dot with no move, a drag out, a drag back onto the circle, a drag in to the clamp, Play through the first blank change, a pause, and a continue. The same drag and the same short turn in the dark, at both widths. Reduced motion through the four steps, on the phone, in the dark. The two ticks, one of them with a Chapter 4 tick already stored, and `#chapter-5-5-1-1`. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

## Verdict

The finger still owns the radius, and the clock still owns the angle. The modulus blank fills on the sample where the circle leaves 1, and the segment blank fills on a 16.7ms frame when the point leaves the axis. The turn holds a steady 60 frames a second, on the phone and on the laptop, and again at 4×. A tick writes `progress.test2` and keeps the Chapter 4 tick that was already there. A grey tick writes nothing.

The fill is off the screen the finger is on. At 1280×800 the square runs past the window, and the claim and Play sit below it, so a drag changes a sentence you cannot see. At 390 the claim and Play are on the first screen, and the blanks start under the section heading. Neither exercise tick can share the screen with the point. Exercise 2 is already answered when you arrive, and Play clears it on the first frame. Another batch is worth doing. It is the screen the fill sits on, and how long the tick holds. Then stop.

## The finger

At rest the real part is 0 and the angle is π. The purple point is on the left of the dashed circle. The green dot is on the right. The claim is “The point sits on the left of the unit circle, on the real axis.” A press on the green dot, held, leaves both numbers. A 2px nudge leaves them. The modulus blank stays an underline.

The next move fills it. On the phone the real part goes to 0.14 on that sample, the claim becomes “The radius is \(e^{x}\), larger than 1,” and the modulus blank becomes those same words, 131px wide where the underline was 72. The angle stays π. Letting go leaves the radius. Dragging back onto the circle empties the modulus blank and puts the left-hand sentence back. Dragging the other way fills “smaller than 1” and clamps the real part at −1.2. The same three sentences, in the same samples, in the dark and on the laptop.

On the phone that swap shortens the claim from 53px to 27px, and Play hops from y = 798 to y = 772. The picture stays at y = 371. On the laptop the claim is already one line, 26px, and Play does not hop.

A drag that starts in the middle of the square does not scroll the page. The green dot is the only thing in the square that moves the radius.

## The blanks

Four underlines, and two of them are already decided at rest.

The modulus line is empty. The segment line, “A vertical segment in the strip lands on the circle of radius,” is empty. Exercise 1, “exp(0) is,” is empty, and its tick is grey. Exercise 2 is not empty. The words “land together at −1” are already in the blank, and its tick is already live, opacity 1. The picture opened on the left-hand point, which is the end of the walk, so the answer is spent before the finger moves.

Play spends it. The first frames take the angle from π to −3.05. The end blank clears, the tick goes grey, and on the phone the tick jumps from y = 436 to y = 409, 27px, because the answer had wrapped to 54px and the underline is 27. On the laptop the answer fits on one line, and the tick moves 1px. A pause leaves the angle where it is. Four hundred milliseconds later it is the same angle.

The segment line fills at the bottom and at the top, and during Play it fills when the angle is −2.78, on a 16.6ms frame. The block of blanks goes from 87px to 88px. It clears again as the point comes back to the axis. That pop does not move the cards. The words name a vertical segment in the strip. The square draws one point.

The modulus line and the claim say the same sentence. The claim is the one on the first phone screen. The blank is the copy, at y = 1130.

## The tick

Both ticks are 44px tall and 68px wide. Grey is opacity 0.55. Live is opacity 1. The word changes on the click: Tick, then Ticked. The status moves with it.

Exercise 2 can be ticked on the still you open. With `4.1.3` already stored, that click writes `{"4.1.3": true, "5.1.2": true}`. The status becomes “Next is §5.1, Exercise 1, page 135. 1 of 2 exercises.” A click on Exercise 1’s grey tick leaves the store and leaves the label Tick.

Exercise 1 comes live only at angle 0. Reduced motion’s second step is that still: the blank reads 1, the tick is live, and the button says Next step. The next step is the top of the circle, and the tick is grey again. A pause at angle −1.90, still on the unit circle, leaves it grey. Play crosses angle 0 in one frame. `#chapter-5-5-1-1` opens on that still, scrolls to the card, and the picture is above the window (on the laptop the picture bottom is at −238 and the tick is at 355). Ticking it there, with Exercise 2 already ticked, writes both ids beside `4.1.3`. The status is “Done. 2 of 2 exercises.” The section’s left edge goes from 1px to 4px, rgb(38, 112, 42).

You cannot press either tick while the point is in view. On the phone the green dot is at y = 550 and Exercise 1’s tick is at y = 1472. Exercise 2’s tick is at y = 2206, under a card 718px tall. On the laptop the dot is at y = 571 and the ticks are at 1403 and 1813. The distances are 832px and 1242px, and the window is 800px.

## The clock

After Pause the angle was the same 400ms later. Reduced motion scheduled 0 frames in 400ms, and each Next step scheduled 0. The four presses land on the bottom, the right, the top, and the left. The button says Next step, then Start again. It never says Pause. The bottom and the top fill the segment line. The right fills Exercise 1. The left fills Exercise 2.

Play on the phone, 1.6 seconds, was 138 frames, median 16.7ms, 95th percentile 16.7ms, none over 20ms, no long task. The drag that filled the modulus blank was 59 frames, the same median, none over 20ms. The laptop matches, in light and in dark. With the CPU slowed to 4×, 1.5 seconds of Play was 91 frames, median 16.7ms, none over 20ms, and the frame that cleared the end blank was 16.6ms. Pause holds the angle. The next press says Pause and continues from that angle.

## The page

On the phone the square is 358px, from y = 371 to 729. The claim ends at 790. Play ends at 842 in the 844px window. The blanks start at 1130. The first screen is the title, the status, the circle, the claim, and Play.

On the laptop the square is 480px, from y = 331 to 811, in the 800px window. The claim starts at 819. Play starts at 853. The blanks start at 1132. The first screen ends in the bottom of the square. The sentence the drag changes is below it. The paper to the right of the square is the rest of the column.

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The empty underline is that same text colour. The tick sits on rgb(21, 28, 43). The axes stay blue, the circle and the ray stay orange, the handle stays green, and the point stays purple. The same positions, the same Play and Pause, the same blanks.

The four later sections are titles, marked Later. They sit under the ticks.

## Cut

- The rows above the square. The lede and the Next bar put the 480px square’s bottom at 811, and Play starts at 853. Move the Next bar down with the walk, so the claim and Play are on the 1280×800 screen. On the phone the claim is 53px at rest and 27px once the radius leaves 1, and Play hops from 798 to 772. Keep that claim one line, as it already is on the laptop.
- The segment blank. It names a vertical segment the square does not draw. It fills at angle −2.78 and clears on the way back, off the screen, twice a lap. The idea line already states the identity.
- The modulus blank. It repeats the claim and sits at y = 1130. The claim is the line the drag fills, once that claim is on the first screen.
- The exercise tick, so it shares the screen with the point and holds for the still. Exercise 2 arrives filled, which is the left-hand point, and Play clears it at angle −3.05, jumping the phone tick 27px. Exercise 1 is live only at angle 0. Hold each one while the point is within 0.35 radians of that end, and move the tick up out of the Figure 5.2 quotation. On the phone that quotation puts the tick 1656px below the dot.

## Add

Nothing. No slider, no scrubber, no spring, no second clock, no §5.2 picture, no chips.

## Another batch

Yes. One batch, then stop. The four cuts above, in that order.

The handle, the colours, the shared tick store, and the frame clock are the lesson, and they already hold. Something real is left, and it is the screen: the fill and the tick happen where the finger cannot see them, and the tick dies on the first frame of Play. The four Later cards sit under the ticks. This lens leaves them. After those four cuts, nothing of this walk’s touch is left. A batch that opens §5.2 will hang the next section under a tick the point cannot share a screen with.

## taste-skill (batch 7)

Branch `cursor/book-chapter-path-df29`, commit `ee723a8`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5, light and dark. The live picture, the walk, and the stylesheet match this commit. `#chapter-5` at 1280×800 and at 390×844. From the still: a press on the green dot, a 2px nudge, a drag out, and a drag in to the clamp. Play for a second and a half, a pause, and the angle held. Reduced motion through the four steps, on the phone, in the dark. The Exercise 1 hint. A tick of Exercise 2 with a Chapter 4 tick already stored, and a click on Exercise 1’s grey Tick. `#chapter-5-5-1-1`. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

### Verdict

The first screen is the circle, the sentence, and Play. The strip line is gone. Exercise 2 asks where the images of \(\pm i\pi\) are. The four Later titles stay, the reading the other two notes kept. The card reads its answer before it asks the question.

Another batch is worth doing. It is the one cut below. After that, stop.

### What I could actually do

`#chapter-5` opens on THE BOOK and Chapter 5. The exponential. The square is next.

At 1280, in light and in dark, the square is 480×480, from x = 304, y = 179, so its bottom is at 659. The claim is one line at y = 667: “The point sits on the left of the unit circle, on the real axis.” Play is 44px tall, from 701 to 745, in an 800px window. The lede starts at 769, so the first screen ends on “The hint stays”.

On the phone the square is 358×358, from y = 166 to 524. The claim wraps to two lines and ends at 585. Its box is 53px, the height of those two lines. Play ends at 637 in an 844px window. The lede is three lines and ends at 739. The Next card starts at 779 and its bottom is at 866.

A press on the green dot, and a 2px nudge, leave the real part at 0 and the angle at \(\pi\). A drag to the right, on the phone, sets the real part to about 0.96 and leaves the angle at \(\pi\). The claim and the modulus blank both say the radius is \(e^{x}\), larger than 1. Play stays at y = 593, and the claim box stays 53px. A drag the other way clamps the real part at −1.2, both lines say smaller than 1, and Play stays at 593. The same larger sentence, on the laptop in the dark, leaves Play at y = 701.

Play says Pause while the point moves. At 40ms the angle is about −3.12 and the claim says the point sits on the unit circle. Exercise 2’s blank is still “land together at −1”, and its Tick is still live. At 440ms the angle is about −2.80 and the blank is still filled. At 480ms the angle is about −2.78, the blank is empty, and the phone Tick has moved from y = 1630 to y = 1602. That Tick is below the window. Pause puts the button back to Play. Four hundred milliseconds later the angle is the same number, about −2.04.

Reduced motion, from a fresh load, on the phone, in the dark, radius 1, button Next step:

- The left. Exercise 2 reads “land together at −1” and Tick is live. Exercise 1’s blank is empty and its Tick is off.
- The bottom. The claim says the point sits on the bottom of the unit circle. Both blanks are empty.
- The right. The claim says the right-hand point. Exercise 1 fills with 1 and Tick wakes.
- The top. The claim says the top. Both blanks are empty.
- The left, and the button says Start again. Exercise 2 fills again. The button never says Pause. Four hundred milliseconds on the bottom still, the angle is the same number.

The Exercise 1 hint is “Definition 5.1, page 130, is the series for \(e^{z}\). The right-hand point of the unit circle is \(z = 0\).” The button goes away.

With `4.1.3` already stored, a click on Exercise 1’s grey Tick leaves the store. A click on Exercise 2’s live Tick writes `{"4.1.3": true, "5.1.2": true}`. The label becomes Ticked. The status becomes “Next is §5.1, Exercise 1, page 135. 1 of 2 exercises.”

`#chapter-5-5-1-1` opens at real part 0 and angle 0. The claim says the right-hand point, Exercise 1 is filled with 1, and the page is scrolled to that card. On the phone the square’s bottom is at −512. The page a student opens is `#chapter-5`. The hash stays.

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The axes stay blue, the circle and the ray stay orange, the handle stays green, and the point stays purple. The same positions as the light page.

### What clicks

The claim names the frame it is on, and it names larger and smaller when the green dot leaves the unit circle. The modulus blank fills with that same sentence, and it stays empty on the unit circle. Play is on the first screen at both widths, and on the phone the radius sentence keeps Play where it was.

Exercise 2 is the one question the left-hand point answers. The shading and the rays are gone. The strip blank is gone. The hint stays closed until you ask. Tick is 44px. The tick that is live is the one that reaches the shared store, and it keeps the Chapter 4 tick.

The four Later rows are titles: 5.2 The Complex Logarithm, page 137; 5.3 Complex Exponents, page 143; 5.4 Trigonometric and Hyperbolic Functions, page 148; 5.5 Inverse Trigonometric and Hyperbolic Functions, page 159. They stay. The cite under them is Howell and Mathews, Chapter 5, Elementary Functions, page 130, and Back to the book is the last line.

### What gets in the way

**The card asks the question under the answer.** Exercise 2 opens with “The images of \(\pm i\pi\) land together at −1”, a live Tick, the cite, and then “Precisely where should the images of the points \(\pm i\pi\) be located?” Exercise 1 opens with “\(\exp(0)\) is” and a grey Tick, the cite, and then the sentence that asks why \(\exp(0)\) is 1. On the phone the filled answer wraps to 54px. The Tick for Exercise 2 sits at y = 1630. The green dot sits at the middle of the square, y = 345. The window is 844. The answer is on a later screen, and it is the first thing that screen says.

The hint button is the width of the card, 884px on the laptop and 290px on the phone. That is the card. The kicker, the four colours, and the square in the column stay. The paper to the right of the 480px square is that column.

### Cut

- The question goes above the blank on both cards. The pin, the question, the blank, then Tick. The cite stays with the pin. Exercise 2’s blank keeps filling on the left-hand point, including the frame the page opens on. Exercise 1’s blank keeps filling on the right-hand point of the unit circle.

### Add

Nothing. No logarithm, no powers, no second plane, no scrubber, no colour key. The Later titles stay.

### Another batch

Yes. One batch, then stop. It is the one cut above.

The circle, the sentence, and Play are on the first screen. The strip line is gone, and Exercise 2 asks the question the left-hand point answers. Something real is left, and it is the order of that card: the answer is the first line. After the question leads, nothing real is left.

## unslop (batch 7)

Branch `cursor/book-chapter-path-df29`, commit `ee723a8e`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5. The live walk is that commit. Headless Chrome, light and dark, at 390×844 and at 1280×800. From the still: a press on the green dot with no move, a drag out, and a drag in to the clamp. Play for a fifth of a second and for seven tenths, then a pause, and the angle held. Reduced motion through the four steps, on the phone, in the dark. Both hints. A tick on Exercise 2 with `4.1.3` and `4.2.5` already stored. `#chapter-5-5-1-1`. No console errors. No sideways scroll at either width (`scrollWidth` matched the window).

The shell stays. The kicker, the four teaching colours, the uppercase flags, and the card's full-width hint button are the book path. The picture is the one bright thing on the page.

## Verdict

The four cuts from the last note are on the page. On the laptop the claim and Play sit in the 800px window. The segment line is gone. Exercise 2 asks where the images of \(\pm i\pi\) are, and the hint names the strip and the left-hand point. Exercise 1's hint names the right-hand point of the unit circle as \(z = 0\).

The card reads the answer first. The blank and Tick sit under the title, then the cite, then the question. On the frame the page opens on, Exercise 2 already says the images land together at −1, and the question is the line under the cite. A drag of the green dot draws a hard frame around the square. That frame is the browser's auto outline, and `:focus-visible` is false while it shows. One more batch is worth doing. It is the two cuts below. After that, stop.

## What the hand does

At rest the real part is 0 and the angle is π. The claim is "The point sits on the left of the unit circle, on the real axis." A press on the green dot, with no move, leaves both numbers. The modulus blank stays an underline.

A drag to the right, on the phone, sets the real part to about 0.96 and leaves the angle at π. The claim says the radius is \(e^{x}\), larger than 1. The modulus blank says the same, with the word modulus. Play stays at y = 593. The claim box stays 53px tall, so the one-line radius sentence does not pull Play up. A drag the other way clamps the real part at −1.2, the claim says smaller than 1, and Play is still at 593. The same radius sentence, on the laptop in the dark, is one line, and Play ends at 745.

Play says Pause while the point moves. At a fifth of a second the angle is −2.98, about 0.16 from the left, the claim is "The point sits on the unit circle," and Exercise 2 still reads that the images land together at −1, with Tick ready. At seven tenths the angle is −2.59, about 0.55 from the left, that blank is empty, and Tick is grey. Pause says Play. Four hundred milliseconds later the angle is the same number.

Reduced motion opens on Next step, on the left. The four presses land on the bottom, the right, the top, and the left. The button says Next step through the four presses, and Start again on the left. It never says Pause. On the bottom the sentence is the bottom of the unit circle, and both blanks are empty. On the right the sentence is the right of the unit circle, on the real axis, and Exercise 1's blank reads 1, with Tick ready. On the top the sentence is the top, and that 1 clears. On the left the resting sentence is back, and Exercise 2 reads that the images land together at −1, with Tick ready. The modulus blank stays empty on all four.

Ticking Exercise 2 writes `5.1.2` into `mv:progress.test2` beside `4.1.3` and `4.2.5`. The status becomes "Next is §5.1, Exercise 1, page 135. 1 of 2 exercises." Exercise 1's Tick stays disabled on the left-hand frame.

`#chapter-5-5-1-1` opens at the right-hand point, real part 0, angle 0. The claim names the right of the unit circle. Exercise 1's blank is 1. On the phone the page is scrolled 1036px, the card sits at y = 144, and the square is above the window.

## What reads as the page

The title is "Chapter 5. The exponential." The lede, under Play, is "Section 5.1. A blank fills when the picture makes it true. The hint stays closed until you ask." Hints open on ask and the button goes away. Exercise 1's hint is "Definition 5.1, page 130, is the series for \(e^{z}\). The right-hand point of the unit circle is \(z = 0\)." Exercise 2's hint is "Figure 5.2, page 133, is the strip \(-\pi < y \le \pi\). The two ends are the left-hand point." The cite on each card is Howell & Mathews, Complex Analysis, the exercise, page 135, CC BY 4.0. The idea line is Identity (5.1), page 132, and the two read links are Definition 5.1, page 130, and Figure 5.2, page 133. Sections 5.2 through 5.5 are Later, with their pages. The chrome is quiet in both themes. Light paper is #f6f3ec. Dark paper is #0d121c, and the sentence is rgb(233, 237, 245). In the light, blue is rgb(11, 99, 173), orange is rgb(168, 67, 0), green is rgb(0, 110, 83), and purple is rgb(157, 58, 138). In the dark those four are rgb(98, 173, 242), rgb(255, 157, 92), rgb(63, 208, 160), and rgb(228, 143, 210).

On the phone the square is 358×358, from y = 166 to 524. The claim is two lines at rest, from 532 to 585. Play is 44px tall and ends at 637 in the 844px window. The lede starts at 661. The status card, "Next is §5.1, Exercise 1, page 135. 0 of 2 exercises.", starts at 779, so the fold cuts the bottom of that card. The same boxes in the dark.

On the laptop the square is 480×480, from x = 304, y = 179, so its bottom is at 659. The claim is one line, from 667 to 693. Play runs from 701 to 745. The window is 800. The lede starts at 769, and its second line is past the fold. The status card starts at 861. The same clip in the dark.

Each exercise card is the title, the blank, Tick, the cite, the question, and Show the hint. The hint button is the width of the card. On the laptop that is 884px.

## What is still false

**The question sits under the answer.** Exercise 2 opens on "The images of \(\pm i\pi\) land together at −1," with Tick ready, and the cite, and then "Precisely where should the images of the points \(\pm i\pi\) be located?" Exercise 1 is the same order. On the right-hand point the card reads "\(\exp(0)\) is 1" and then asks why that is 1. The blank is the line the picture fills. The question is the sentence it belongs to, and it is the line under the cite.

**A drag frames the square.** After the drag the stage is the focused element, `:focus-visible` is false, and the outline is `auto`, 5px, rgb(16, 16, 16). On the phone that is a black edge on the square, with a white pixel outside it. On the dark laptop the edge is rgb(238, 238, 238). The page's own ring is 3px in the focus colour, and it is the one that shows for the keyboard. The auto outline is the one the drag leaves. A click on Play moves the focus and the frame goes.

## Cut

- On each exercise card, the question, then the blank, then Tick, then the cite, then the hint. Exercise 2 still opens filled with "land together at −1", on the left-hand point. Exercise 1's blank still fills with 1 on the right-hand point, and it holds while the point is within 0.35 radians of that end. The hint button stays the width of the card.
- The auto outline on the square. A pointer drag leaves the plane unframed. The keyboard ring stays the 3px focus colour, on `:focus-visible`.

## Add

Nothing. No logarithm, no powers, no third exercise, no second plane, no scrubber. The Later rows stay titles. The kicker, the flags, and the four colours stay. The modulus blank stays. It fills when the radius leaves 1.

`#chapter-5-5-1-1` still scrolls the card up and leaves the picture above the window. Leave the hash. The tick stays on the card. It does not have to share the first screen. That screen is the square, the claim, and Play.

## Another batch

Yes. One batch, then stop. It is the two cuts above.

The gesture is the one a student came for, and the sentence follows the point. Play is on the first screen at both widths, in both themes. The segment line is gone. The two hints name the point the picture is on. When the question is the first line of the card, and a drag leaves the square unframed, the loop should rest. Sections 5.2 through 5.5 stay titles.

Something real is left, and it is those two. The rest of the last note is on the page.
## appllama (batch 7)

Branch `cursor/book-chapter-path-df29`, commit `ee723a8`. Used like a MAT 412 student on https://book-preview.complexanalysis.pages.dev/#chapter-5. The live walk is that commit. Headless Chrome, light and dark, at 390×844 and at 1280×800. On the phone the finger was a touch. On the laptop it was the mouse. A press on the green dot with no move, a 2px nudge, a drag out, a drag back onto the circle, a drag in, Play through a full turn, a pause, and a continue. The same drag and the same turn in the dark, at both widths. Reduced motion through the four steps, on the phone, in the dark, from a fresh load. A second lap with the CPU slowed to 4×. No console errors. No sideways scroll at either width (the phone's scrollWidth is 390, the laptop's is 1265).

The modulus blank stays. The other two notes kept it. This pass leaves it.

## Verdict

One more batch. The tick holds while the point is within 0.35 radians of its end, Play stays where it is, and the turn is a steady 60 frames a second. A mouse drag then draws a frame around the square.

The finger still owns the radius and the clock still owns the angle. A touch on Play says Pause and the point moves. A second press says Play and the angle is the same 400ms later. The claim under the square is the sentence that changes, and it is on the first screen at both sizes, in both themes. The frame is what is left.

## The finger

At rest the real part is 0 and the angle is π. The claim is "The point sits on the left of the unit circle, on the real axis." A press on the green dot, held, leaves both numbers. A 2px nudge leaves them. A drag to the right sets the real part to 0.45, the angle stays π, and the claim becomes "The radius is \(e^{x}\), larger than 1." On the phone that claim is one line inside a box that stays 52.7px, the height of the two-line resting sentence, and Play stays at y = 593. Dragging back onto the circle restores the left-hand sentence and the same y. Dragging the other way fills "smaller than 1" and Play stays at 593. The laptop claim is already one line, 26.3px, and the radius sentence makes it 26.7px. Play moves from 700.9 to 701.2.

A drag that starts in the middle of the square does not scroll the page and does not move the radius.

Through a full turn the phone's Play stays at y = 593 and the claim box stays 52.7px, including the short line "The point sits on the unit circle." A touch that changes the word from Play to Pause moves the button from 593 to 594, one pixel. On the laptop the same word change is 700.9 and 701.9.

A touch drag leaves the square unframed. The stage is not focused, and the outline stays none. A mouse drag, at 390 and at 1280, focuses the stage. `:focus-visible` stays false, and the outline is `auto`, 5px. On the light page that edge is rgb(16, 16, 16). On the dark laptop it is rgb(238, 238, 238), a white box around the picture. The page's own ring is the 3px focus colour, and it is the one that shows for the keyboard.

## The tick

Exercise 2 is live on the still you open, because that still is the left-hand point. Exercise 1 is grey, opacity 0.55. Both ticks are 44px tall and 68px wide. Live is opacity 1.

Play leaves the left-hand window on the frame where the angle is 0.353 from −π. The frame before, at 0.340, the tick is still live. The same edge, reversed, brings it back at 0.341 from π, and the frame before, at 0.354, is grey. Exercise 1 comes live at 0.341 from 0 and goes grey at 0.353. On the laptop that window is 53 frames, 883ms. The phone lap crosses the same four edges, each on a 16.7ms frame.

On the phone the words "land together at −1" wrap, so the tick under that blank moves from y = 1629.8 to y = 1602.4 when the window ends, 27px. Exercise 1's "1" fits on its line, and that tick moves 1px. On the laptop both answers fit, and both ticks move 1px. The 27px is below the picture. Play, at y = 593, does not move with it.

Reduced motion, from a fresh load, opens on Next step. The four presses land on the bottom, the right, the top, and the left. The right fills Exercise 1 and the tick is live. The left fills Exercise 2. The button says Next step, then Start again. It does not say Pause. Each still is the same angle 400ms later.

## The clock

After Pause the angle was −1.9374201894688245, and 400ms later it was the same number. The button said Play. The next press said Pause and continued from that angle. On the laptop the held angle was −0.4321260695012761, the same 400ms later. A full turn ends on the left-hand point and the button says Play again.

The phone lap was 540 frames over 9.0 seconds, median 16.7ms, 95th percentile 16.8ms, none over 20ms. The 482 frames whose button said Pause match that. The laptop turn matches, in light and in dark. With the CPU slowed to 4×, the phone's frames were median 16.7ms, maximum 16.8ms, none over 20ms, and the frame that cleared the left-hand tick was 16.7ms. No long task.

## The page

On the phone the square is 358px, from y = 166 to 524. The claim ends at 585. Play ends at 637 in the 844px window. The lede ends at 739. The status card ends at 849. The modulus blank, which this pass leaves, starts at 1154. The ticks start at 1270 and, while Exercise 2 is filled, at 1630.

On the laptop the square is 480px, from y = 179 to 659, in the 800px window. The claim is one line at 667. Play ends at 745. The lede starts at 769 and its second line crosses the bottom of the window.

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The axes stay blue, the circle and the ray stay orange, the handle stays green, and the point stays purple. The same positions, the same Play and Pause, the same hold.

The four later sections are titles, marked Later. They sit under the ticks. This lens leaves them. The tick does not share the first screen, so this lens does not need it above the question.

`#chapter-5-5-1-1` opens at angle 0, with Exercise 1 filled and its tick live, and the picture above the window. The page a student opens is `#chapter-5`.

## Cut

- The auto outline on the square. A pointer drag leaves the plane unframed. The keyboard ring stays the 3px focus colour, on `:focus-visible`.

## Add

Nothing. No slider, no scrubber, no spring, no second clock.

## Another batch

Yes. One batch, then stop. It is the one cut above.

The hold, the button, and the frame clock are the lesson, and they hold. Something real is left, and it is the frame a mouse drag draws around the square. A touch does not draw it. After that frame is gone, nothing real is left of this walk's touch.

## Chapter 6, batch 1

Branch `cursor/chapter-6`. Headless Chrome, light and dark, 390×844 and 1280×800. `#chapter-6` fresh, then Play on the real integral, the stage tick, Go to 6.2, Another on a segment card, the Cauchy proof blank, Play on the deformation, `#book`, and `#chapter-1`. No console errors. No failed assets. No sideways scroll at either width.

The page is six stages. 6.1 opens on a half turn of \(e^{it}\): the green point is at \(-1\), the purple integral is at \(2i\), and the sentence is false of a full turn. Play walks the angle. At the full turn the integral is back at \(0\), the blank fills, and Stage complete comes live. A second Play, on the segment, pauses the first. Eight steps fill \(\exp(2+i\pi/4)-1\). The green circle starts with the pole outside, integral \(0\), and Play carries the pole inside both circles, both integrals \(2\pi i\). Arrow keys move the same handle. A press that is not on the handle does nothing.

6.4, 6.5, and 6.6 are titles, pages, one sentence, and the theorem links. They are marked Later. The roadmap lists all six and says Open. Chapter 4's walk is unchanged. `#chapter-1` stays on the book.

Practice is `data/practice/ch6.json`, drawn by a local card. The proof blank accepts \(v\,dx+u\,dy\). Another deals a new segment with a computed answer. The shared engine is not in the tree yet.

## Cut

Nothing from this page. The three pictures are the batch.

## Another batch

Yes. Draw 6.4 (the integral is \(F\) at the end minus \(F\) at the start), 6.5 (the value inside, read from the boundary), and 6.6 (Morera, and a bounded entire function sitting still). Then the ML inequality, Examples 6.14–6.16, and the rest of the contour exercises. Hand the cards to `js/practice/` when that loop lands.

## unslop (ch6 batch 1)

Branch `cursor/chapter-6`, tip `e8841fad`. Preview https://ch6-preview.complexanalysis.pages.dev/#chapter-6. Headless Chrome, light and dark, at 390×844 and at 1280×800. Fresh storage. The square was scrolled to the middle of the phone before the drag, because the handle starts below the fold. Play for about seven tenths of a second, then a pause. No console errors. No sideways scroll (`scrollWidth` matched the window at both widths, both themes). Reduced motion was not walked.

Light slop. The chrome is already this product: cream paper `#f6f3ec`, dark paper `#0d121c`, Iowan titles, one accent, the four teaching colours only inside the planes. No emoji, no glow, no hue gradient, no exclamation mark. The miss is where the richness sits. The first screen is four sentences, and the plane is a 16rem stamp under them.

Direction, taken from the page that is already here. Product: a MAT 412 student drags one point and watches a complex integral change. Character: ink, exact, warm paper. World: a notebook page and a pencil on the plane. Moments: the three planes (the orange circle and the purple integral, the segment and its eight samples, the two circles and the pole). Signature: the green point, the same green on every stage.

## Verdict

ANOTHER BATCH. One batch, and it is the five cuts below. When those are on the page, this lens rests. Sections 6.4, 6.5, and 6.6 stay titles.

## Ranked cuts

1. **The first screen is the square, the claim, and Play.** At 390×844, light and dark, the square starts at y = 732 and is 256×256, so the window shows 112px of the purple circle. The green handle is the vertical middle of that square, about y = 860, below the fold, so the drag cannot start on the first screen. Play is at y = 1057 and ends at 1101. At 1280×800 the square is still 256×256, at y = 595, so it ends at 851. The claim is at y = 859 and Play is at y = 893, ending at 937, in an 800px window. Above the square sit the colour paragraph (79px on the phone, 53px on the laptop), the why (105px on the phone, 53px on the laptop), and the observe line. Change: delete `#chapter-colours`. On 6.1, 6.2, and 6.3, delete the why paragraph and the observe line above the square. The chapter lede is the 6.1 gesture, "Drag the green point around the orange circle." Each later stage has one sentence above its square, and that sentence is the gesture. The status card moves to under Play. `.ch6-stage` leaves the 16rem cap and uses the column, capped so the square, the claim, and Play end inside the first screen at both widths, both themes. The square is wider than 16rem.

2. **Arrive with the blank empty.** 6.1 opens at `clock.set(0.5)`, phase `half`. The claim is "Half a turn leaves the integral at \(2i\)." and the blank already reads "From \(0\) to \(\pi\) the integral is \(2i\)." A drag off that point clears the blank and the claim becomes "The integral has left \(0\)." 6.3 opens at `clock.set(0)`, `where` is `outside`, and the blank already reads "The integral over the green circle is \(0\)." The claim already says the purple circle is still \(2\pi i\). Change: open 6.1 at a quarter turn, phase `move`, both blanks empty. The half blank fills only at `half`, the full blank only at `full`. Open 6.3 on the edge, where the blank stays empty, and a drag inside fills \(2\pi i\) while a drag outside fills \(0\). Open 6.2 at 0 steps. Its exact blank already waits for 8, and the arrival sentence should wait with it.

3. **The worked paragraph is the integral the picture draws.** Under 6.1, Worked example is Example 6.1, page 163, and the paragraph computes \((t-i)^{3}\) as \(-5/4\). The picture and the blanks are \(\int e^{it}\). Under 6.3 the paragraph says \(e^{z}\), \(\cos z\), and \(z^{n}\) integrate to \(0\), which is Example 6.12. The picture is the pole and the two circles. Change: the 6.1 paragraph states the circle the hand is on, \(2i\) from \(0\) to \(\pi\) and \(0\) from \(0\) to \(2\pi\). Example 6.1 stays a read link. The 6.3 paragraph states the drag: the pole inside both circles, both integrals \(2\pi i\); the green circle drops the pole, its integral is \(0\), and the purple circle stays \(2\pi i\). Example 6.12 stays a read link.

4. **The sheet and the flash stop reprinting the blank.** The 6.1 sheet's third line is "A full period of \(e^{it}\) integrates to \(0\). Half a period integrates to \(2i\)." That is the blank, printed again under the blank. The 6.2 sheet's fourth line says the eight steps land beside \(\exp(2+i\pi/4)-1\), which is the exact blank and the next-step card. The 6.3 flash `ch6-6.3-which-flash` turns over onto the four sheet lines (Theorem 6.5, Theorem 6.6, Theorem 6.1, Corollary 6.1). Change: delete that 6.1 line, that 6.2 line, and that flash. The 6.1 sheet keeps the definition and the antiderivative. The 6.2 sheet keeps the parametrization, the segment formula, and the opposite contour. The 6.3 sheet keeps its four theorem lines, and the multiple choice that asks for Theorem 6.6 stays.

5. **The page ends on the last row.** At 390 the page is 11980px. Section 6.6 ends at y = 10977. "Back to the book" is at y = 11798. The bottom of the scroll is a blank cream screen, the footer, and that one link. `.chapter-path` pads by `calc(100dvh - var(--header-h))`, about a viewport of void. Change: that padding becomes one header of space, so the last Later row can clear the bar and the footer follows it. The bottom screen is the 6.6 row.

## What to keep

The three planes, the four colours, and the one clock. A drag off the half turn clears \(2i\) and the claim follows the point. Play says Pause while it runs, and a second press leaves the angle where it stopped. A pointer drag focuses the square and leaves it unframed (`:focus-visible` is false, outline `none`). The keyboard ring stays the 3px focus colour. Two controls on a picture, the drag and Play. The cards, the source line, Show the back, Check, and Another. The segment cards, the segment generator, the Cauchy proof, and the deformation question. The semicircle cards stay; they are the exam question, and this batch does not draw a second picture for them. The kicker, the flags, and the uppercase labels are the book path. Later stays a title, a page, one sentence, and the theorem links. No new type, no new colour, no new chrome.

## taste-skill (ch6 batch 1)

Branch `cursor/chapter-6`, commit `e8841fad`. Preview https://ch6-preview.complexanalysis.pages.dev/#chapter-6. Used like a MAT 412 student in headless Chrome, light and dark, at 390×844 and at 1280×800. Fresh storage. The first screen, then the square scrolled up, Play through a full turn, a drag of the green mark, a second Play on the segment while the first was running, reduced motion through the steps on the phone in the dark, the parametrization choices on 6.2, Another on a segment card, the three Later rows, and the Chapter 6 node on `#book`. No console errors. No failed assets. No sideways scroll (`scrollWidth` was 390 and 1280).

The gallery inspector was left unrun. Its bans are one accent, no small-caps label, no 1px card, and a floor of four photographs. Those are the site: four teaching colours, the kicker, the section card, and a diagram drawn for the integral. The measurements below are the Chrome walk.

### Verdict

ANOTHER BATCH.

The thing to be able to do is watch the purple point be the integral of the green point. That gesture is on the page. The page you land on hides it. At both sizes, in both themes, the first screen is a colour legend and a status card, and Play sits below the fold. One batch is the cuts below. After that, stop. Sections 6.4, 6.5, and 6.6 stay titles until this screen shows the integral.

```
ROUND 1
Seen in one second: a chapter title and a legend, with the top of a small circle cut off at the bottom.
Idea (one sentence): the purple point is the integral, and the green point walks the orange path.
Live thing: Play, or a drag of the green mark. A second Play pauses the first.
Layout words by section: hero=text stack / 6.1=card / 6.2=card / 6.3=card / later=outlined title
Scores: design 5 · usability 6 · creativity 8 · content 7 → overall 6.1
Caps applied: Play is off the first screen at both widths, so usability stays at 6. The 256px square sits in the left of a 952px card, so design stays at 5. The kicker, the four colours, the serif title, and the section card are the site, and they are not in the cuts.
Top three problems:
1. Phone fold and laptop fold. The square, the claim, and Play are below a legend. Cut that legend, and put Play on the first screen.
2. Laptop fold. The square is 256px in a 952px card, and the circle is 98px across. Let the square use the column, and keep Play on the screen.
3. The 6.1 picture, scrolled up. The claim says 2i and the worked paragraph says −5/4. One integral on that screen.
```

### What I could actually do

`#chapter-6` opens on THE BOOK and Chapter 6. Complex Integration. The title is one line, 25.85px, at both widths.

On the phone the column is x = 16, width 358. The lede is three lines, y = 142 to 220, in the muted ink. The colour paragraph is three lines, y = 236 to 315: "Blue is the axes. Orange marks the path or the pole. Green is the point you drag. Purple is the integral." The status card, "Next is 6.1. 0 of 3 stages.", sits at y = 401. Section 6.1 starts at y = 469. The why is three lines at y = 566. The observe is two lines at y = 672: "Drag the green point around the orange circle. Purple is the integral." The square is 256×256 at y = 732, so an 844px window shows the top 112px of it, a purple dot and the top of the orange circle. The claim is at y = 996. Play is 70×44 at y = 1057.

On the laptop the column starts at x = 304 and is 952px wide. The same stack ends with the square at y = 595, 256×256, so its bottom is at 851 in an 800px window. The claim is one line at y = 859. Play is at y = 893. The card to the right of the square is empty paper. The same frames in the dark: paper rgb(13, 18, 28), sentence rgb(233, 237, 245), lede rgb(166, 176, 195).

The square draws two circles, each 98px across. The green mark and the purple mark are 9×9. At rest the green mark is on the left of the orange circle and the purple mark is on the top of the dashed circle. The claim is "Half a turn leaves the integral at 2i." The blank under the worked paragraph already reads "From 0 to π the integral is 2i." The full-turn blank is empty. Stage complete is 44px tall and disabled. The worked paragraph is Example 6.1, and it says the value is −5/4.

Play says Pause. The claim becomes "The integral has left 0." At the end of the turn the claim is "A full turn brings the integral back to 0.", the full-turn blank reads 0, the half-turn blank clears, and the button says Play. Starting Play on the segment while that turn is running sets the first button back to Play and leaves the phase on "move". Four hundred milliseconds later the phase is still "move", and the segment button says Pause.

A drag of the green mark leaves the half turn and sets the same "left 0" sentence. On the laptop the drag focuses the svg, `:focus-visible` stays false, and the outline stays none.

Reduced motion, on the phone, in the dark, opens on Next step at the half turn. The presses land on the moving frame, the full turn (the button says Start again), the quarter, and the half turn. The button says Pause on none of them.

The 6.2 square is the same 256px. It opens at 2 of 8 steps, the claim says so, and the exact-value blank is empty. The worked paragraph is the segment from 0 to \(2+i\pi/4\), which is the segment on the canvas. The four parametrization choices are 290px wide and 44px tall, one of them 53px where the formula wraps. The right choice shows its why and disables the row. Another on the segment card deals a new pair of endpoints.

The 6.3 square opens with the orange pole outside the green circle. The claim says the green integral is 0 and the purple circle is still \(2\pi i\). The blank reads 0.

The page is 11877px on the phone. Section 6.1 is 1585px, 6.2 is 3911px, and 6.3 is 4096px. Sections 6.4, 6.5, and 6.6 are transparent boxes with a 1px border, 254px, 198px, and 280px tall. Each one is a LATER label, a title, a page, one sentence, and the theorem links.

On `#book` the Chapter 6 node says Open. Section 6.1 is marked Next. Sections 6.4, 6.5, and 6.6 are marked Later. Walk Chapter 6 is a text link, 23px tall.

### What clicks

One picture, one drag, one Play, and a second Play pauses the first. The claim follows the frame: half a turn, left 0, a full turn back at 0. The full-turn blank fills at the full turn, and it is empty before that. Stage complete stays 44px and starts disabled.

The colours are the course colours, and they sit on the marks. Blue is the axes, orange is the path or the pole, green is the handle, purple is the integral. Light and dark use the same positions. The button says Pause while the point moves, and Next step under reduced motion.

Section 6.2's worked paragraph is the segment the picture draws. The choices are real mistakes, the why appears after the tap, and Another deals a new segment. The cites name Howell and Mathews and the page. The kicker, the serif title, and the section card stay.

### What gets in the way

**The first screen is the legend.** The colour paragraph and the observe say the same thing, "purple is the integral," and both of them sit above the square. Play is 213px past the phone fold and 93px past the laptop fold. A student who does not scroll can read the title and cannot press Play.

**The integral is a stamp.** 256px in a 358px phone column, and 256px in a 952px laptop card. The circle is 98px. The two marks are 9px. The laptop card's right half is the paper.

**Two answers share the 6.1 picture.** The claim and the blank say \(2i\). The paragraph under Play, labeled Worked example, says the value is \(−5/4\). That paragraph is \((t-i)^{3}\) from 0 to 1. The picture is \(e^{it}\).

**The last three camps are empty frames.** The fill is already gone. The 1px border is still there, so 6.4, 6.5, and 6.6 read as cards with one sentence in them.

### Cut

1. **The first screen is the square, the claim, and Play.** At 390, Play is at y = 1057 in an 844px window, and the square starts at y = 732. At 1280, Play is at y = 893 in an 800px window. Cut the colour paragraph. Move "Next is 6.1" to under Play. The why stays one or two lines under the stage title, and the square follows it. The observe is one line under the square, then the claim, then Play. Play's bottom stays inside 844 and inside 800, in both themes.

2. **The square uses the column.** It is 256×256, the circle is 98px, and the green mark is 9×9, in a card 358px wide on the phone and 952px wide on the laptop. Size the stage the way the exponential square is sized, and stop at the width that still keeps Play on that first screen. Draw the green mark large enough to see on the phone. The hit stays the 44px it already is.

3. **One integral under the 6.1 picture.** The claim says the half turn leaves the integral at \(2i\), and Example 6.1 under it says the value is \(−5/4\). The worked sentence becomes the half turn on the canvas, and the full turn at \(0\). The evaluation of \((t-i)^{3}\) moves onto a practice card. Section 6.2 already works this way: the worked line is the segment the picture draws.

4. **Later rows are titles.** Sections 6.4, 6.5, and 6.6 keep a 1px border on a transparent ground, 198px to 280px tall. Drop the border. Keep the LATER label, the title, the page, the one sentence, and the theorem links.

5. **Walk Chapter 6 is a 44px control.** On the book the door is a text link 23px tall. Make it the button the other walks already use.

### Add

Nothing. No scrubber, no second clock, no colour-key paragraph, no new hue. Sections 6.4, 6.5, and 6.6 get no picture in this batch.

### Another batch

Yes. One batch, then stop. It is the five cuts above, in that order.

The gesture is already the one a student came for. Play walks the integral, a drag moves the same mark, Pause holds, and the next picture's Play pauses the first. When the square, the claim, and Play are the first screen, and the sentence under that square is the integral the square is drawing, the loop should rest.

### What to keep

The three pictures, the one drag, and the one clock. The claim that flips, the full-turn blank that fills at the full turn, and Stage complete at 44px. The four colours on the marks, in light and in dark. The 6.2 choices, the why after the tap, and Another. The cites, the exam lines, and the summit sentences. The kicker and the section card. The outline that a pointer drag leaves off the square.

## reviewer (ch6 batch 1)

Branch `cursor/chapter-6`, draft PR #45, reviewed at `e8841fa` against Howell & Mathews, Complex Analysis, 202 Updated Edition (the PDF at complexanalysis.org, 471 pages). Preview `https://ch6-preview.complexanalysis.pages.dev/#chapter-6` at 390×844, then the fixed page locally at 390×844 and 1280×800, light and dark. No console errors. No sideways scroll. Arrow Left on the green circle carries the pole inside and fills \(2\pi i\). Arrow Right drops it and fills \(0\).

Verdict: **ACCEPT WITH FIXES**. The fixes are on this branch.

Checked against the printed pages: Definition 6.1 and Example 6.1 are page 163, and \((t-i)^3\) from 0 to 1 is \(-5/4\). Definition 6.2 and Example 6.6 are page 170. Theorem 6.1 and Example 6.7 are page 172, and the segment integral is \(\exp(2+i\pi/4)-1\). The eight-step midpoint sum rounds to \(4.23+5.20i\), the total the book prints on page 171. Exercise 6.2.3 starts on page 178, and \(\int z^2\,dz\) on the upper unit semicircle is \(-2/3\). Theorem 6.5 is stated on page 183. Cauchy's proof, Equation (6.28), and the continuous-\(f'\) hypothesis are on page 184, so the proof cards' page 184 is the proof, not a mis-cite of the statement. Example 6.12 is page 186. Theorem 6.6 is page 187. Corollary 6.1 is page 188: \(2\pi i\) for \(1/(z-z_0)\), and \(0\) for every other integer power \(1/(z-z_0)^n\). Theorems 6.8, 6.9, 6.10, 6.13, and 6.18 are pages 193, 194, 197, 203, and 206. Section openers 163, 167, 181, 193, 197, 203 match the contents. Circle and segment generator values match an independent quadrature on 60 seeds. Live code does not import `kit/`. `js/core/map-route.js` still matches the kit copy.

What was wrong, and the change:

1. The 6.3 sentence said both integrals are \(2\pi i\), then \(0\) and \(2\pi i\), and never named a function. That value is \(\int dz/z\) on a positively oriented circle (Corollary 6.1), not the integral of a general pole and not the entire functions in Example 6.12. The claim, the blank, and the instruction now say \(1/z\). Dropping the pole still makes the green integral \(0\) and leaves the purple integral \(2\pi i\).
2. The exam line "a half period integrates to \(2i\)" is false. \(\int_\alpha^{\alpha+\pi} e^{it}\,dt = 2ie^{i\alpha}\), which is \(2i\) only when \(\alpha\) is a multiple of \(2\pi\). Any full period is \(0\). The sheet and the flash memory now say so. The picture's own half turn, from \(0\) to \(\pi\), is still \(2i\).
3. Segment cards cited Theorem 6.1, page 172, as the reason an antiderivative is evaluated at the ends. Theorem 6.1 is the parametrization. The note now says that.
4. Circle cards cited Corollary 6.1 when the pole was outside. The corollary needs \(z_0\) inside. Outside, including a polynomial, the cite is Theorem 6.5, page 183. Inside and not the power \(-1\), the cite stays Corollary 6.1.
5. The checker rejected equivalents it listed: \(e^{2+i\pi/4}-1\), \(2+\frac{i\pi}{4}\), \(ux-vy\), \(0+0i\), and a parenthesized Green's integrand. Those forms now match.

Left as is: within \(0.06\) of the green circle the sentence says the pole is on it and the integral is not defined. Exactly on the circle that is true. A hair inside, the integral of \(1/z\) is still \(2\pi i\). The band is the width of the orange dot.

Keep: the three pictures, the page cites above, Example 6.1's \(-5/4\), the eight-step sum beside \(\exp(2+i\pi/4)-1\), Cauchy's proof blanks (the split, Green's theorem, Cauchy-Riemann, and \(0\)), and the computed generators.

## Chapter 6, batch 2

Branch `cursor/chapter-6`. Headless Chrome, light and dark, 390×844 and 1280×800. Fresh storage. The first screen, then Play through the full turn, the bend, the Cauchy point, and the Liouville circle. No console errors. No sideways scroll.

The colour paragraph is gone. One gesture line sits above each square. The status card is under Play. Play ends at y = 821 in the 844 window and at y = 777 in the 800 window, in both themes. The square is 324px on the phone and 320px on the laptop, both wider than 16rem. The green mark is 16 viewBox units. The pole-on-the-circle band is one pixel of that plane: exactly on is undefined, and 0.98 is still inside.

6.1 opens at a quarter turn, both blanks empty. 6.2 opens at 0 steps. 6.3 and 6.5 open on the edge. 6.4 opens on the straight segment. 6.6 opens before the estimate collapses. The 6.1 worked line is \(2i\) and \(0\). Example 6.1's \(-5/4\) is a practice card. The 6.3 worked line is the \(1/z\) drag. The sheet no longer reprints the picture blanks, and the four-theorem flash is gone.

6.4, 6.5, and 6.6 are stages. Bend the path and the integral of \(z\) stays \(4+2i\). Drag inside the unit circle and \(z/(z-z_0)\) returns the green point. Drag the radius and \(1/R\) collapses, which is Liouville. The page tail is one header, not a viewport.

`ch6-circle` and `ch6-segment` export `generate(seed, params)`. The math functions use that order too, so nothing swaps the arguments.

## Next

Goursat's triangle subdivision, the remaining contour exercises (6.2.5, 6.2.9, 6.3.1–6.3.4), and Examples 6.17–6.19 on the antiderivative. Hand the cards to the practice engine when that branch lands. Do not edit its registry.

## pedagogy (ch6 batch 2)

Branch `cursor/chapter-6`, tip `216bf1a`, draft PR #45. Preview https://ch6-preview.complexanalysis.pages.dev/#chapter-6. Headless Chrome, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800 light, and the theme control into the dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. The page is 17681px on the phone.

The first screen, in both themes and at both widths, is the lede, stage 6.1, the drag line, the quarter-turn picture, the claim, and Play. Play ends at y = 821 in the 844 window and at y = 777 in the 800 window. The claim reads "The integral has left 0. The real part and the imaginary part are still separate." Both blanks are empty. Stage complete is disabled. Dark ink on that claim is `rgb(233, 237, 245)` on paper `rgb(13, 18, 28)`. Light ink is `rgb(26, 34, 48)` on `rgb(246, 243, 236)`.

What a student can leave with. The four sentences are on the page, and the tick does not make the student say them.

Cauchy-Goursat. The sheet's first line states it: analytic inside and on a simple closed curve, the integral is 0 (Theorem 6.5, page 183). The stage that carries the name opens on the pole of \(1/z\) sitting on the green circle, and the claim says that integral is not defined. One Play from that edge puts the pole inside, fills the blank with \(2\pi i\), and enables Stage complete. The summit under that tick is deformation. The flash the stage opens on is Corollary 6.1. A student who plays and ticks can say "both circles give \(2\pi i\)." The zero theorem is a line they can scroll past, eight cards down. On the phone the 6.3 block is 5578px and the practice inside it is 4080px. The summit is a 79px paragraph at y = 11509, 17px, weight 400, the same ink as the claim.

Cauchy integral formula. Theorem 6.10 is the flash and the first sheet line, and the picture is the right idea: on the edge the formula stops, inside it returns the green point, and the blank fills with the words "the green point." The student never writes \(f(z_0)\). The derivative formula is absent, so the purple \(1/R\) in 6.6 has no parent on the page. Example 6.21 is already computed on the sheet, the line above the card: \(\int_{|z|=2} e^{z}/(z-1)\,dz = 2\pi i\, e\).

Liouville. The summit states it, and the radius picture shows the estimate collapse. Play runs the radius to 4, the claim says the derivative is forced to 0, and the blank fills 0. The worked paragraph under the picture has already said the only survivor is 0, so \(f\) is constant. The word the theorem asks for is constant. The blank asks for 0. Morera is the flash the deck shows first (the cite on arrival is Theorem 6.13). The tick does not read that card.

ML. Theorem 6.3 is the fourth line of the 6.2 sheet, and it is the second flash. The deck opens on Theorem 6.1, with Next card underneath. No card asks for an \(M\) or an \(L\).

### The climb, stage by stage

6.1 is the one opening that teaches before it tells. A drag off the quarter turn keeps the same claim and leaves both blanks empty. One Play to the end sets the claim to "A full turn brings the integral back to 0", fills the \(2\pi\) line with 0, and enables Stage complete. The half-turn line is empty again. The two facts cannot sit in the blanks together: the \(2i\) line fills only while the point is at the half turn, and the full turn clears it. The worked paragraph above those lines already says both, "From 0 to \(\pi\), \(\int e^{it}\,dt=2i\). From 0 to \(2\pi\) it is 0." Example 6.1 is the production, and it is one blank for the final value. The prompt says to split the real and imaginary parts. There is no blank for either part. I typed \(2i\), the number the picture had been about, and pressed Check. The note opened with \((t-i)^3=(t^3-3t)+i(1-3t^2)\) and ended at \(-5/4\). Stage complete was already enabled. I pressed it. The button said Completed. The card still held \(2i\).

6.2 opens at "0 of 8 steps," which is the right fade for a sum. The worked paragraph then prints the derivative the next card asks for: \(z'(t)=2+i\pi/4\). The stage is 3962px, and the practice block is 2592px, six cards, before a summit that restates Theorem 6.1. The semicircle pair is the faded example the picture does not spoil: choose the parametrization, then the product, then the value. On the segment card I pressed \(z(t)=e^{it}\), \(0\le t\le 2\pi\). The line stayed wrong, all four buttons stayed on, and the note said "The segment from 0 to \(B\) is \(z(t)=Bt\)." That is a next move. The correct button is the one a student cannot read: \(z(t)=(2+i\pi/4)t\) and \(0\le t\le 1\) wrap into two broken columns, and the three wrong choices are one line each. Typing 0 on the segment generator opened a note that states the antiderivative and does not state the value. Typing 1 on the circle generator (seed 1, \(|z-(-i)|=2\), power \(-2\), pole outside) opened "Theorem 6.5, page 183, says the integral is 0."

6.4 opens on the straight segment and the claim is "Bend the green point." That is the right first sentence. The worked paragraph under the links already has the result, \(4+2i\) on every path. Play bends the path, the claim says the integral is still \(4+2i\), the blank fills \(4+2i\), and the tick enables. I typed 0 on the card. Check printed \(((3+i)^2-(-1-i)^2)/2=(8+6i-2i)/2=4+2i\).

6.5 opens on the circle, tick disabled, blank empty. On the laptop the worked paragraph is on that same screen, and it says the integral equals the green point inside and 0 outside. Play fills "the green point." I typed \(e\) on Example 6.21. Check said Theorem 6.10 "gives \(2\pi i\, e\)."

6.6 opens with the estimate uncollapsed and the tick off. In the dark, on the phone, the last screen of the chapter is the \(e^{z}\) question, four choices, the summit "An entire function that stays bounded is constant.", and a disabled Stage complete. The summit sits under the question it answers. The choices themselves are the right trap: unbounded, every entire function, modulus 1, needs a pole. I pressed "Yes. Every entire function is constant." All four stayed on, and the note said \(|e^{z}|=e^{x}\) grows with \(x\). That note names the test and does not name the button. It is the miss the other cards should copy.

No stage opens with why this camp is the next one. The chapter lede is "Six stages, from a real interval to a contour you can move." Each stage's first sentence is the drag. After the 6.1 tick, 6.2's title is the next thing in the scroll, which is the right place, and its first sentence is another drag. "Go to 6.2" is the button under the first Play, at y = 870. The summit is at y = 1937 and the tick is at y = 2016. After all six ticks the status says "Done. 6 of 6 stages." and that same button, still at y = 870, says "Back to the book." The last tick is at y = 18202. Nothing under the Liouville summit names Taylor series.

The card cites for Examples 6.14, 6.15, and 6.16, Theorems 6.9, 6.10, 6.13, and 6.18, and Example 6.21 all open `sec_complex-integrals.html`. The pin text names pages 189 through 206. The read links on the stages already point at the section those theorems live in.

### Verdict

ANOTHER BATCH. The six pictures open on an empty blank, and Play on the first screen is the right start. A student who ticks every stage can gesture deformation, path independence, and a shrinking \(1/R\). They can recite the sheet. They have not had to state Cauchy-Goursat as the zero theorem, write the integral formula, produce "constant," or bound an integral by \(ML\). More exercises on top of notes that already contain the value will not fix that.

### Ranked fixes

1. **A miss names the next move and keeps the value.** Typing \(2i\) on Example 6.1 revealed the expansion and \(-5/4\). Typing 0 on the 6.4 card revealed the arithmetic ending at \(4+2i\). Typing \(e\) on Example 6.21 revealed \(2\pi i\, e\). Typing 1 on the circle card revealed that the integral is 0. Change: the note on a wrong check is a next move with the answer string left out. The proof miss already does this ("Equation (6.28) splits the integral into those two real line integrals"). The \(e^{z}\) miss already does this (\(|e^{z}|=e^{x}\) grows). Show the value line only after the check is right.

2. **The blank under the picture is the student's, and Stage complete reads it.** One Play fills 0, \(2\pi i\), \(4+2i\), "the green point," or 0, and enables the tick. The 6.1 half-turn line is empty again at the end of that Play, so a full turn erases \(2i\). I ticked 6.1 with \(2i\) still wrong on Example 6.1. Change: those lines are inputs. On 6.1 both stay filled once each has been checked, and a later full turn does not clear \(2i\). Stage complete stays disabled until the picture holds and that input checks. The worked paragraph stops one step before the number.

3. **The Cauchy-Goursat tick is the zero theorem.** The flag says Cauchy-Goursat. Play from the edge enables the tick when both integrals are \(2\pi i\), and the summit says deformation. Change: earn this tick on a closed integral of an analytic function, with the claim becoming 0 and the summit one sentence of Theorem 6.5. Keep the \(1/z\) drag as the next beat, after that sentence, with deformation as its own summit. The proof card stays. Its sentence says Cauchy's argument assumes \(f'\) continuous.

4. **One why at the top of the stage, one next camp under the summit.** The first sentence of every stage is the drag. "Go to 6.2" and, later, "Back to the book" sit at y = 870, under the first Play. The Liouville tick is at y = 18202. Change: one sentence under the stage title, before the gesture, saying what this camp is for and which fact from the previous camp it uses. Under the summit, one line naming the next camp. 6.6 names Chapter 7. Move "Go to …" onto that line.

5. **ML, the derivative formula, and Morera are things the student does.** ML is a sheet line and the second flash. 6.5's sheet prints \(2\pi i\, e\) above the card that asks for it, and it has no derivative formula for the \(1/R\) in 6.6. The 6.6 deck opens on Morera, and the picture's blank fills 0. Change: one ML card whose answer is a bound the student computes. The miss says "length times a bound on \(|f|\)" and does not print the product. Add the derivative form on 6.5, and take the computed Example 6.21 off the sheet until that card is right. On 6.6 the Morera card is answered in its own right, and the radius blank is the word constant.

6. **The later cites open the section they name, and the right 6.2 choice is one line.** Examples 6.14–6.16 and Theorems 6.9, 6.10, 6.13, and 6.18 open the complex-integrals section. The stage read links already have the anchors. On Example 6.7 the correct parametrization wraps into two columns and the wrong ones do not. Change: the card cite uses the stage's read href. Each choice stays on one line.

### Keep

The arrival on every picture: quarter turn with the claim withholding \(2i\), 0 of 8 steps, the pole on the circle, the straight segment saying "Bend the green point," the formula stopped on the circle, the estimate not yet collapsed. Play on the first screen, both themes, both widths. The semicircle pair, the inside-or-outside cards (Examples 6.14–6.16 and the circle generator), and the card that asks which theorem a pole inside actually is. Cauchy's three proof blanks. The four \(e^{z}\) choices, and the miss that says the modulus grows. One gesture, one Play, the four colours, and Stage complete disabled until the picture holds.

## test-prep-coach (Ch6 batch 2)

Branch `cursor/chapter-6`, draft PR #45. Preview https://ch6-preview.complexanalysis.pages.dev/#chapter-6. Used as a student with the exam in a few days. Chrome, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800 light, and the theme control into the dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. The phone page is 17681px before any note opens. Play ends at y = 821 in the 844 window and at y = 777 in the 800 window, in both themes. Dark ink on the sheet and on the cards is `rgb(233, 237, 245)` on paper `rgb(13, 18, 28)`. The six For the exam lists are on the page. All six Stage complete buttons arrived disabled.

What I could recite, and what I could not compute. The sheets state Definition 6.1, Theorem 6.1, the opposite contour, Theorem 6.3 as \(|\int|\le ML\), Theorem 6.5 as 0, Theorem 6.6, Corollary 6.1, Theorem 6.9, Theorem 6.10, Morera, and Liouville. Flipping a card is Show the back, then Next card. That is enough to memorize a sentence. It is not enough to sit §6.5 or §6.6. Theorem 6.12 (page 199, equation (6.48)) is the derivative formula the section title is plural for, and it is absent. Theorem 6.19 (page 206), the fundamental theorem of algebra, is absent. Example 6.11 (page 177), the ML estimate a student is asked to produce, is absent.

### What I tried

6.1. The sheet is the split and the antiderivative at the ends. The flash asks for that split, and the second flash is the right trap: a half period of \(e^{it}\) that starts at \(\alpha\) is \(2ie^{i\alpha}\), and \(2i\) only when \(\alpha\) is a multiple of \(2\pi\). Example 6.1 asks for one number. I typed \(2i\), the value the picture had been about. Check opened \((t-i)^3=(t^3-3t)+i(1-3t^2)\) and ended at \(-5/4\).

6.2. The worked paragraph already prints the derivative the next card asks for, \(z'(t)=2+i\pi/4\). On the phone the correct parametrization is a 290×53 button and the three wrong ones are 44px and one line each. The correct button breaks into two columns, \(z(t)=(2+\) beside \(0\le t\le\), and \(i\pi/4)t\) beside the rest of the interval. The wrong ones read straight through: the unit circle, \(z(t)=t\), and \(z(t)=2+i\pi t/4\). At 1280 that correct choice is one 44px line, 884px wide. I typed \(2+(\pi/4)i\) for the derivative. Check marked it wrong and printed \(2+i\pi/4\). \(2+i\pi/4\) was accepted. I typed \(e^{(8+i\pi)/4}-1\) for the value. Check marked it wrong. \(\exp(2+i\pi/4)-1\) was accepted. The semicircle choices stay one line at 390: \(e^{it}\) from 0 to \(\pi\), the clockwise \(e^{-it}\), the diameter, and the full circle. The ML flash turns over onto \(|\int_C f\,dz|\le ML\). Nothing asks for an \(M\) or an \(L\).

The segment generator, seed 3, is the segment from \(-2\) to \(-2+i\) and the integrand \((z-a)^2\). I typed \(2+11i/3\). Check marked it wrong, and the note named the antiderivative without printing the value. \(2+(11/3)i\) was accepted. The circle generator, 40 seeds, returns 0 on 38 of them and \(2\pi i\) on 2. Seed 1 on the page is \(|z-(-i)|=2\), power \(-2\), pole outside. I typed \(2\pi i\). The note said the integral is 0.

6.3. The worked tag reads Example 6.12, page 186. The paragraph under it is the \(1/z\) drag: both circles \(2\pi i\), then the green circle drops the pole and its integral is 0. Example 6.12 is \(e^{z}\), \(\cos z\), and \(z^{n}\) integrating to 0. The which-theorem card is the question an exam asks. I pressed "Theorem 6.5, so the integral is 0." All four buttons stayed on, and the note said the pole means Theorem 6.5 does not apply and deformation keeps the value. Cauchy's first proof blank still withholds the integrand. The Green's blank does not: I typed \(u_y-v_x\) and the note produced \(u_x-v_y\). Example 6.14's prompt already gives the partial fractions and says both poles are inside, then offers \(4\pi i\), \(2\pi i\), \(0\), and \(-2\pi i\). Example 6.16's prompt already writes \(2/z-1/(z-1)\). I typed \(2\pi i\). The note said the \(2/z\) term contributes \(-4\pi i\) and the \(1/(z-1)\) term contributes \(-2\pi i\).

6.4. The worked paragraph says the integral is \(4+2i\) on every path, and the card below asks for that number after telling you the antiderivative is \(z^2/2\). I typed 0. Check printed \(((3+i)^2-(-1-i)^2)/2=(8+6i-2i)/2=4+2i\).

6.5. The sheet's second line is Example 6.21 already evaluated: \(\int_{|z|=2} e^{z}/(z-1)\,dz=2\pi i\, e\). The card under it asks for that integral. I typed \(e\). Check said Theorem 6.10 gives \(2\pi i\, e\). The flash is Theorem 6.10 only. Example 6.25, page 200, \(\int_{|z|=2} e^{z^2}/(z-i)^4\,dz=-4\pi/(3e)\), is the \(n=3\) case of Theorem 6.12. Exercises 3 and 5 of §6.5, page 201, are the same kind: a power 2 and a power 4 in the denominator. None of those are on the page.

6.6. The deck opens on Morera. Next card is Liouville, "a constant." The \(e^{z}\) choices are the real mistakes: unbounded, every entire function, modulus 1, needs a pole. I pressed "Yes. Every entire function is constant." All four stayed on, and the note said \(|e^{z}|=e^{x}\) grows. Theorem 6.19, the proof the section exists to produce, is not a card.

### Verdict

ANOTHER BATCH. The sentences you would memorize the night before are on the page, and the questions the book grades are not. One batch is the six fixes below. After those are drills a student can miss without being handed the number, this lens rests.

### Ranked fixes

1. **Theorem 6.12 is the card, and Example 6.21's value comes off the sheet.** Theorem 6.12, page 199, equation (6.48): \(f^{(n)}(z_0)=n!/(2\pi i)\int_C f(z)/(z-z_0)^{n+1}\,dz\). Example 6.25, page 200, and §6.5 Exercises 3 and 5, page 201, are that formula. The sheet at y = 14483 states Theorem 6.10 and then prints \(2\pi i\, e\), which is the card at y = 16183. Typing \(e\) revealed \(2\pi i\, e\). Change: the second sheet line is Theorem 6.12, the power in the denominator is \(n+1\), divide by \(n!\), multiply by \(2\pi i\). One next-step card for Example 6.25 whose answer is \(-4\pi/(3e)\). A wrong check says "the power is 4, so \(n=3\), and you divide by \(3!\)" and does not print the value. Example 6.21 stays the first card. \(2\pi i\, e\) leaves the sheet.

2. **A miss names the next move and keeps the number.** Typing \(2i\) on Example 6.1 revealed \(-5/4\). Typing 0 on the 6.4 card revealed the arithmetic ending at \(4+2i\), and that same \(4+2i\) is the worked paragraph above the card. Typing \(2\pi i\) on Example 6.16 revealed \(-4\pi i\) and \(-2\pi i\). Typing \(u_y-v_x\) revealed \(u_x-v_y\). Typing \(2\pi i\) on circle seed 1 revealed that the integral is 0. The \(e^{z}\) miss already withholds the button. The segment miss already withholds the value. Change: every wrong check follows those two. The value line shows only after the check is right. The 6.4 worked paragraph stops at "an antiderivative is \(z^2/2\)." The 6.2 worked paragraph stops at the parametrization and does not print \(z'(t)\).

3. **Deal the integral the exam does not answer with 0, and make ML a number.** Forty seeds of the circle generator: 38 are 0, and 2 are \(2\pi i\). Example 6.14's prompt has already split \(2z/(z^2+2)\) and said both poles are inside. Example 6.16's prompt has already written \(2/z-1/(z-1)\). Example 6.11, page 177, asks for \(|\int_C dz/(z^2+1)|\le 1/(2\sqrt{5})\) on the segment from 2 to \(2+i\), and the page only has the sentence \(|\int|\le ML\). Change: half the circle seeds are power \(-1\) with the pole inside, and a quarter use a denominator power past 1 so the answer is the Theorem 6.12 value. Example 6.14's first blank is the partial-fraction split, and \(4\pi i\) is the second. Example 6.16's first blank is the orientation of each loop. One ML card for Example 6.11, answer \(1/(2\sqrt{5})\). The miss says "length times a bound on \(|f|\)" and does not print the product.

4. **The right parametrization is one line, and the handwriting on the paper counts.** At 390 the correct Example 6.7 choice is 290×53 and broken into two columns. The three wrong choices are 44px and readable, and they are the real mistakes: the unit circle, \(z(t)=t\) on a real interval, and \(z(t)=2+i\pi t/4\). At 1280 the correct choice is one line. \(2+(\pi/4)i\) was marked wrong. \(e^{(8+i\pi)/4}-1\) was marked wrong. \(2+11i/3\) on segment seed 3 was marked wrong, and \(2+(11/3)i\) was marked right. Change: each choice stays on one line at 390. Accept \(2+(\pi/4)i\), \(e^{(8+i\pi)/4}-1\), and \(2+11i/3\).

5. **Liouville's deck starts with the theorem the exam proves, and a miss comes back.** Theorem 6.19, page 206: a polynomial with no zero makes \(1/P\) entire and bounded, so Liouville says \(1/P\) is constant. The page never names that theorem. The 6.6 deck opens on Morera, and the only controls are Show the back and Next card. The \(e^{z}\) card is the right trap. Change: the deck opens on Liouville, then the \(e^{z}\) card, then Morera. Add one proof card for Theorem 6.19 whose steps are "\(1/P\) is entire," "\(1/P\) is bounded," and "Liouville says constant." A wrong step names the missing hypothesis and does not state the conclusion. A flash you miss stays at the front until the back is recalled.

6. **The 6.3 worked line wears the example it states.** The tag on the preview is Example 6.12, page 186. The sentence under it is both circles \(2\pi i\) for \(1/z\), then 0 when the green circle drops the pole. Example 6.12 is the entire functions integrating to 0. Change: that tag is Corollary 6.1, page 188, and Theorem 6.6, page 187. Example 6.12 stays a read link on a sentence that is Example 6.12.

### Keep

The half-period flash, \(2ie^{i\alpha}\), and the Definition 6.1 flash, both page 163. The semicircle choices for Exercise 6.2.3, page 178, all 44px at 390, and the value \(-2/3\). The which-theorem card, and the miss that names deformation and leaves the buttons on. Cauchy's three proof blanks on page 184, and the first miss, which says Equation (6.28) splits the integral and does not write \(v\,dx+u\,dy\). The four \(e^{z}\) choices and the miss that says the modulus grows. The segment miss that names the antiderivative and withholds the value. The sheet lines that are the statements, once the computed examples are off them. The arrival on every picture, Play on the first screen in both themes and both widths, and Stage complete disabled until the picture holds.

## reviewer (Ch6 batch 2)

Branch `cursor/chapter-6`, draft PR #45, reviewed at `d49927c` against Howell & Mathews, Complex Analysis, 202 Updated Edition (the 471-page PDF). The HTML edition uses different example numbers; each link below was opened and matched to the PDF statement, not to the HTML's number.

Verdict: **ACCEPT WITH FIXES**. The fixes are on this branch.

Checked against the printed pages. Section openers 163, 167, 181, 193, 197, 203 match the contents. Definition 6.1 and Example 6.1 are page 163, and \(\int_0^1(t-i)^3\,dt=-5/4\). Definition 6.2 and Example 6.6 are page 170; the eight-step midpoint total rounds to \(4.23+5.20i\), and the exact value on page 171 is \(\exp(2+i\pi/4)-1\). Theorem 6.1 and Example 6.7 are page 172. Theorem 6.3, the ML inequality, is page 177. Exercise 6.2.3 starts on page 178, and the answer key on page 443 gives \(-2/3\) for the upper unit semicircle. Theorem 6.5 is stated on page 183. Cauchy's proof, Equation (6.28), and the continuous-\(f'\) hypothesis are on page 184. Example 6.12 is page 186. Theorem 6.6 is page 187. Corollary 6.1 is page 188: \(2\pi i\) for \(1/(z-z_0)\), and \(0\) for every other integer power. Examples 6.14, 6.15, and 6.16 are pages 189, 190, and 190, and the book states the values \(4\pi i\), \(2\pi i\), and \(-6\pi i\). The figure-eight arithmetic on page 191 is \(-4\pi i\) from \(2/z\) and \(-2\pi i\) from \(-1/(z-1)\). Theorems 6.8 and 6.9 are pages 193 and 194. Example 6.9 is the same ends, \(-1-i\) to \(3+i\), and the same \(4+2i\). Theorem 6.10 is page 197. Example 6.21 is page 198, and \(i2\pi e\) is \(2\pi i\, e\). Theorem 6.12, the derivative formulas, is page 199. Theorem 6.13 is page 203 and requires every closed contour, not every triangle. Theorem 6.17, Cauchy's inequalities, is page 205: \(|f'(z_0)|\le M/R\). Theorem 6.18 is page 206.

Circle and segment generators match an independent quadrature on 200 seeds, including the straight-segment logarithm. A polynomial no longer refuses an endpoint that is not a singularity, so the segment fallback \(\int_0^{1+i} z^2\,dz=(-2+2i)/3\) computes instead of throwing. `node tools/check_vectors.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` passed. Live code does not import `kit/`. `js/core/map-route.js` still matches the kit copy.

What was wrong, and the change:

1. The read link labeled Example 6.1 opened `Int_ex`, which is \(\int_0^{\pi/2}\exp(t+it)\,dt\), the book's Example 6.2. It now opens the \((t-i)^3\) example. The link labeled Example 6.21 opened the power-integral display that is not that example. It now opens \(\int_{|z|=2} e^{z}/(z-1)\,dz\). Theorem 6.10's link opened the section top; it now opens the formula.
2. Practice cards for Examples 6.1, 6.14, 6.15, 6.16, and 6.21, and for Theorems 6.3, 6.9, 6.10, 6.13, and 6.18, fell through to the complex-integrals section. Each cite now opens the statement it names.
3. Morera's flash and the 6.6 sheet said every triangle integrates to 0. Theorem 6.13 says every closed contour in a simply connected domain. The card and the sheet now say that.
4. A non-negative power with the sample point inside the circle was explained by Corollary 6.1. That corollary is the integral of \(1/(z-z_0)^n\). An entire power is Theorem 6.5, page 183, whether or not the sample point is inside.
5. The radius picture draws \(1/R\) without saying that is the case \(M=1\) of Theorem 6.17, page 205. The gesture, the picture label, the worked line, and a read link now name that bound.
6. The 6.3 worked tag said Example 6.12, page 186, over the paragraph about \(1/z\). Example 6.12 is \(e^{z}\), \(\cos z\), and \(z^{n}\) integrating to 0. The tag is now Corollary 6.1, page 188, and Example 6.12 is a read link to that example.
7. A correct value in another handwriting was marked wrong: \(2+(\pi/4)i\), \(e^{(8+i\pi)/4}-1\), and \(2+11i/3\). The checker now accepts a typed value that parses to the same complex number, and it still rejects a nearby wrong one, including the book's rounded sum \(4.23+5.20i\) for the exact exponential.

Left as is:

1. At radius 3 the purple mark is still \(1/3\), and the blank says the derivative is 0. Theorem 6.18 needs the bound on every circle. One circle only gives \(|f'|\le 1/3\). The tick still turns on at that radius.
2. Theorem 6.12, page 199, equation (6.48), is not stated on stage 6.5. Example 6.25, page 200, is \(\int_{|z|=2} e^{z^{2}}/(z-i)^{4}\,dz=-4\pi/(3e)\), recomputed from \(n=3\) and \(f'''(i)=4i/e\). That card is not on the page. The sheet still prints the finished value of Example 6.21 above the card that asks for it.
3. The half-turn and full-turn sentences snap inside 0.12 radians. At the edge of the half-turn window the integral is about \(-0.12+1.99i\), and the blank already reads \(2i\).

Keep: the six pictures, the page cites above, Example 6.1's \(-5/4\), the eight-step total beside \(\exp(2+i\pi/4)-1\), the semicircle \(-2/3\), Cauchy's proof blanks (the split, Green's theorem, Cauchy-Riemann, and 0), Examples 6.14–6.16, and the computed generators.

## Chapter 6, batch 3

Branch `cursor/chapter-6`, on top of `3894a6d`. Headless Chrome, light and dark, 390×844 and 1280×800. Fresh storage. No console errors. No sideways scroll. Play ends inside the 844 window at 390 and inside the 800 window at 1280, in both themes.

A wrong check names the next move and leaves the value covered. The value line shows after the check is right. The 6.2 worked paragraph stops at the parametrization. The 6.4 worked paragraph stops at \(z^2/2\). The blanks under the pictures are inputs. Play does not fill them and does not enable Stage complete.

Stage 6.5 states Theorem 6.12, page 199, equation (6.48). Example 6.21 stays the first exercise card. Example 6.25 asks for \(-4\pi/(3e)\), and a miss says the power is 4, so \(n=3\), divide by \(3!\).

Half of the circle seeds are power \(-1\) with the pole inside. A quarter are \(e^z/z^{n+1}\), and the answer is the Theorem 6.12 value. Example 6.14 asks for the split, then \(4\pi i\). Example 6.16 asks for the loop orientation, then \(-6\pi i\). Example 6.11 asks for \(1/(2\sqrt{5})\), and the miss says length times a bound on \(|f|\). The Example 6.7 choices are one 44px line at 390.

The 6.6 practice opens on Liouville, then \(e^z\), then Morera, then Theorem 6.19. A wrong step on that proof names the missing hypothesis. A missed flash stays at the front until Recalled.

The Liouville tick waits until the bound \(1/R\) has been read on every circle in the picture, and the blank is the word constant. At radius 3 the claim is \(|f'|\le 1/3\), one circle. The half-turn and full-turn labels use the value, so 0.12 rad off \(\pi\) is not yet \(2i\).

Stage 6.3 opens on Goursat's subdivision. The tick is Theorem 6.5, the integral is 0. The \(1/z\) drag is the next beat, and deformation has its own summit. Each stage has a why line under the title and Go to the next camp under the summit. 6.6 names Chapter 7. On `#book` the first button opens the chapter that is in progress. The phone drawer lists chapters 1 through 7.

`node tools/check_vectors.mjs` 234/234. `node tools/fractal-smoke.mjs` passed. `node kit/smoke.mjs` passed.

## Next

The picture claims still say the value once the gesture has landed: the half turn says \(2i\), eight steps name \(\exp(2+i\pi/4)-1\), the deform claim names \(2\pi i\) and \(0\), and the Cauchy claim names the green point. The 6.6 sheet and summit still state that a bounded entire function is constant. Exercise 6.3.1 (b) and (d) are not cards. A missed flash stays at the front; there is no longer schedule than that. The shared practice engine is still not in the tree. Chapter 7 is named and is not a page. Chapters 8–11 stay on the book page as Later.

## skeptical-student (chapter-6 batch 3)

Branch `cursor/chapter-6`, tip `c18dde6`. Preview https://ch6-preview.complexanalysis.pages.dev/#chapter-6. Chrome, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800 light, and the theme control into the dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. The phone page is 26044px. The laptop page is 20505px.

I have never seen this subject. I am on a phone. I wanted three things: what you are asking, what I do, and what I just learned.

### What I could actually do

The first screen, in both themes and at both widths, is the title, stage 6.1, one sentence, the circle, a claim, and Play. On the phone the square is 284×284 at y = 437, the claim is at y = 729, and Play is 70×44 at y = 790, so it ends at 834 in the 844 window. On the laptop the square is 272×272 at y = 371 and Play is at y = 712, so it ends at 756 in the 800 window. Dark ink on the claim is `rgb(233, 237, 245)` on paper `rgb(13, 18, 28)`. Light ink is `rgb(26, 34, 48)` on `rgb(246, 243, 236)`.

Play on 6.1 walks the green point around the orange circle and ends on "A full turn brings the integral back to 0." Play on 6.2 lights eight orange dots and says they sit on \(4.23+5.20i\), beside \(\exp(2+i\pi/4)-1\). Play on 6.3 cuts the triangle into smaller triangles and says the integral is 0. Play on 6.4 bends the segment into two green sides over a dashed line and says the ends are still \(-1-i\) and \(3+i\). Play on 6.5 moves the green point inside the unit circle, puts a purple ring on it, and says the integral is the green point. Play on 6.6 grows the orange circle and parks a purple dot near the origin. The claim says the bound \(1/R\) has been read on every circle.

The menu button is 44×44. The Book and chapters 1 through 7 are 44px rows, and Chapter 6 is the marked one. Chapter 7 opens the book on a Later card, page 210.

Typing \(2i\) on Example 6.1 opened "Expand \((t-i)^3\) into a real part and an imaginary part, then integrate each from 0 to 1. The value stays covered." Typing 1 on Example 6.11 opened "length times a bound on \(|f|\)." Pressing "Theorem 6.5, so the integral is 0" left all four buttons on, and the note said the pole means Theorem 6.5 does not apply and deformation keeps the value. The four Example 6.7 choices are one 44px line at 390 (`scrollWidth` 289, `clientWidth` 288). \(2+(pi/4)i\) was accepted as \(z'(t)\). Show the back, then Missed and Recalled, both 44×141.

### Where I got lost

The claim on arrival is "The integral has left 0. The real part and the imaginary part are still separate." I see one purple dot. I cannot tell what is separate, or what number I am supposed to find.

The blank says "From 0 to \(\pi\) the integral is" and the box is empty. I sampled the claim 152 times through one Play, about every 16ms. "Half a turn leaves the integral at \(2i\)" appeared once, at 709ms. The other 151 samples were "left 0" or "back to 0." I typed \(2i\) and \(0\) while the point was still at the top of the circle. Both checks passed. Stage complete stayed disabled, and the only words on it are "Stage complete." The half-turn window is a tolerance of 0.01 on the value. On the 284px square that is about half a pixel along the orange circle. A drag aimed at the exact left point did show \(2i\). A thumb does not land on half a pixel, and Play does not leave the sentence up.

The line under the 6.1 title is "Later integrals come back to this real integral." Under 6.2 it is "A contour is the real integral from 6.1, after a parametrization." Under 6.6 it is "Liouville needs every circle." I do not have those words. I still do not know what the stage is for.

On 6.2 the finished claim prints the exact value, and the blank underneath is "The exact value is". I would copy it and learn nothing about the orange dots. On 6.3 the line under the title, before Play, already says a closed analytic path integrates to 0. Play repeats 0. The blank asks for that 0. On 6.6, after Play, the claim says the bound "has been read." I did not read anything. The blank says "\(f\) is" and waits. The sheet further down says a bounded entire function is constant. That is where the word is.

On the phone the Theorem 6.6 buttons are cut off in the 288px row: "Theorem 6.6, deformation of cor" (`scrollWidth` 346), "Theorem 6.1, so parametrize bot" (378), "Corollary 6.1, so the value is alw" (368). The line above them reads "Reach for ."

The bend has no number on it. After Play I know the ends stayed. I cannot see whether the integral stayed.

### Where I got bored

6.1 is 2482px. 6.2 is 5626px and nine cards. 6.3 is 8272px and twelve cards. The 6.1 summit, "a complex integral is the real integral plus \(i\) times the imaginary integral," sits at y = 2108, under the flashcard and Example 6.1. I had stopped reading before Example 6.11. The pictures that do something (the ring on the inside point, the triangle cutting itself, the purple dot sliding to the origin) are separated by cards that ask me to copy a theorem number.

### Verdict

ANOTHER BATCH. I could press Play, and on 6.5 I could say the words "the green point." I could not finish 6.1 from the picture, I could not read three of the theorem buttons, and I was done with the page about six screens in. One batch is the six cuts below. When the half-turn line stays on the page, the disabled tick says what is missing, and the summit sits under the picture, this lens rests.

### Ranked cuts

1. **The half-turn line stays up, and a dead tick says what is missing.** Through one Play the \(2i\) sentence was on screen for one 16ms sample, at 709ms. Both blanks accepted \(2i\) and \(0\) while the phase was still `move`, and Stage complete stayed disabled with no other label. The window is a value tolerance of 0.01, about half a pixel on the 284px square. Change: once the green point comes within a thumb of the left side of the orange circle, a line under the picture reads "Half a turn: \(2i\)" and stays after Play finishes. The full-turn line can still be the live claim. While Stage complete is disabled, the button's line names the missing piece: "Bring the point all the way around" or "Fill both lines."

2. **The sentence above the box stops before the answer.** After Play on 6.2 the claim is "Eight steps sit on \(4.23+5.20i\), beside \(\exp(2+i\pi/4)-1\)," and the blank is "The exact value is". The 6.3 line under the title, before Play, says a closed analytic path integrates to 0. The 6.6 sheet, between the blank and the tick, says a bounded entire function is constant. Change: the eight-step claim reports \(4.23+5.20i\) and leaves the exact value in the blank. The 6.3 line under the title says this camp is a closed path with nothing inside it; 0 shows up in the claim after the triangle subdivides. "Constant" leaves the 6.6 sheet until that check is right. The summit can keep the word after the tick.

3. **A choice on the phone shows the whole answer, in a sentence.** At 390 the Theorem 6.6 row clips to "deformation of cor", "parametrize bot", and "the value is alw", and the stem is "Reach for ." The same stem is the step text `Reach for ___ .` with the blank removed and the period left behind. Change: the choice wraps onto a second line, and that stem goes away. The question is already the prompt. The Example 6.7 choices already fit on one 44px line; those stay as they are.

4. **The first sentence of the stage is about the picture.** "Later integrals come back to this real integral." "A contour is the real integral from 6.1, after a parametrization." "Liouville needs every circle." The arrival claim says the real part and the imaginary part are still separate, over one purple dot. Change: 6.1 says "Purple is the total so far, while green walks the circle." 6.2 says "Orange dots are pieces of the path. Add them up." 6.6 says "Purple is a bound on the derivative. Watch it as the circle grows." The arrival claim on 6.1 says the total has left 0, and it waits to talk about two parts until the picture draws two parts.

5. **The summit and Stage complete sit under the blanks.** The 6.1 summit is at y = 2108, under two cards. 6.2 is 5626px and nine cards before its summit. 6.3 is 8272px and twelve cards, and its tick is in the middle, at y = 9313, with the rest of the cards after it. Change: on every stage the summit and Stage complete move to just under that picture's blanks. The cards stay on the page, after the tick. Go to the next camp stays with the summit.

6. **The bend and the radius say what just happened.** After Play the bend claim is "The path has bent. The ends are still \(-1-i\) and \(3+i\)." There is no mark for the value, and the blank asks for the integral of \(z\). After Play the radius claim is "The bound \(1/R\) has been read on every circle," and the blank asks what \(f\) is. Change: the bent claim says the integral is the same as on the straight segment, and \(4+2i\) stays in the blank. The finished radius claim says the purple bound shrank to the origin, so the derivative is 0. The miss on that blank says a derivative of 0 means \(f\) does not change, and the word stays covered.

### What to keep

Play on the first screen, both themes, both widths, with the square, the claim, and the button in that window. The four colours on the marks. The triangle that cuts itself when you press Play, and the claim that then says the integral is 0. The inside point with the purple ring, and the claim that ends "the green point." The radius picture once the purple dot has moved off the handle. The four Example 6.7 choices, one 44px line at 390. The misses that leave the number covered: Example 6.1, Example 6.11, and the deformation note that leaves the buttons on. \(2+(pi/4)i\) counting as the derivative. Show the back, Missed, and Recalled. The drawer, chapters 1 through 7, each row 44px. Stage complete staying off until the picture and the blanks agree, once the button says which one is missing.

## reviewer (Ch6 batch 3)

Branch `cursor/chapter-6`, draft PR #45, reviewed at `c18dde6` against Howell & Mathews, Complex Analysis, 202 Updated Edition (the 471-page PDF). The HTML edition numbers the same statements differently. Each anchor was opened and matched to the PDF statement.

Verdict: **ACCEPT WITH FIXES**. The fixes are on this branch.

Checked against the printed pages. Section openers 163, 167, 181, 193, 197, and 203 match the contents. Definition 6.1 and Example 6.1 are page 163, and \(\int_0^1(t-i)^3\,dt=-5/4\). Definition 6.2 and Example 6.6 are page 170. The eight-step midpoint sum rounds to \(4.23+5.20i\), and the exact value is \(\exp(2+i\pi/4)-1\). Theorem 6.1 and Example 6.7 are page 172. Theorem 6.3 and Example 6.11 start on page 177. The book's bound is \(|z-i|\ge 2\) and \(|z+i|\ge\sqrt{5}\), so \(|\int_C dz/(z^2+1)|\le 1/(2\sqrt{5})\) on the segment from 2 to \(2+i\). Exercise 3 of §6.2 starts on page 178, and the answer key on page 443 gives \(-2/3\). Exercise 5 is on page 179, and the key gives \(-32i\) and \(-8\pi i\). Exercise 9 is on page 180, and the key gives \(2\pi i\) and \(0\). Theorem 6.5 is stated on page 183. Cauchy's proof, Equation (6.28), and Goursat's triangular subdivision all begin on page 184. Example 6.12 is page 186. Theorem 6.6 is page 187. Corollary 6.1 is page 188. Examples 6.14, 6.15, and 6.16 are pages 189, 190, and 190, with values \(4\pi i\), \(2\pi i\), and \(-6\pi i\). The figure-eight arithmetic is \(-4\pi i\) from \(2/z\) and \(-2\pi i\) from \(-\int 1/(z-1)\), with the loop about 0 clockwise and the loop about 1 counterclockwise. §6.3 Exercises 1(a) and 1(c) are page 191: \(\pi i\) and \(0\), matching the key. Exercise 2 is \(2\pi i\). Exercise 3 is \(0\), poles at \(\tfrac12\pm i\). Exercise 4(a) on \(|z-1|=2\) is \(0\), and 4(b) on \(|z-1|=\tfrac12\) is \(2\pi i\). Theorem 6.9, equation (6.43), is page 194. Examples 6.17, 6.18, and 6.19 are page 195: \(1+i\), \(-\sin 1+i\sinh 1\), and \(\operatorname{Log}(z_2)-\operatorname{Log}(z_1)\). The HTML line for Example 6.18 is \(i\sinh 1\). Theorem 6.10 is page 197, equation (6.44). Example 6.21 is page 198, and \(i2\pi e\) is \(2\pi i\, e\). Theorem 6.12 and equation (6.48) are page 199. Example 6.25 is page 200, and \(2\pi i\, f'''(i)/3!=-4\pi/(3e)\) with \(f'''(i)=4i/e\). Theorem 6.13 is page 203. Theorem 6.17 is page 205: \(|f'(z_0)|\le M/R\). Theorems 6.18 and 6.19 are page 206. The algebra proof uses \(|1/P|\le 1\) outside a large disk, equation (6.60).

Circle seeds 0 through 79: 40 are power \(-1\) with the pole inside, 20 are \(e^z/z^{n+1}\) with the Theorem 6.12 value, and 20 are \(0\). Each matches a 2000-step quadrature. Segment seeds 0 through 59 match a 4000-step quadrature, including the straight-segment logarithm. `node tools/check_vectors.mjs` is 234/234. `node tools/fractal-smoke.mjs` passed. `node kit/smoke.mjs` passed. Live code does not import `kit/`. `js/core/map-route.js` matches the kit copy. On the local page at 390×844, Exercise 5 reads page 179, Exercise 9 reads page 180, Example 6.17 reads page 195, Another on the circle card retitles it Theorem 6.12 and then Theorem 6.5 with the matching pin, two Arrow Right presses on the radius make the claim \(|f'|\le 2/3\) at radius 1.5, a bare \(1/z-i\sqrt{2}\) is rejected and the split is accepted, and there were no console errors. `scrollWidth` was 390.

What was wrong, and the change:

1. Example 6.17 was cited as page 194. The example, \(\int 1/(2z^{1/2})\,dz=1+i\) from 4 to \(8+6i\), is on page 195. The cite is now page 195.
2. §6.2 Exercise 5 was cited as page 178. The statement, the polygon through \(-4\), \(-4+4i\), \(4+4i\), and 4, and the clockwise upper half of \(|z|=4\), are on page 179. The prompt and the cite now say 179.
3. §6.2 Exercise 9 was cited as page 179. The circle integrals from Exercise 8 are on page 180. The prompt and the cite now say 180.
4. A dealt circle card kept the heading Corollary 6.1 when the seed was Theorem 6.12 or Theorem 6.5. The heading now follows the cite on that card.
5. At radius 1.5 the claim said \(|f'|\le 0.67\), and at radius 1.006 it said \(|f'|\le 0.99\). Cauchy's estimate there is \(2/3\) and about \(0.994\). A nearest hundredth can fall under \(M/R\). Radii on the half-step now print the exact fraction, and any other radius prints a hundredth that stays at least \(1/R\).
6. The 6.3 why said a closed analytic path integrates to 0. The integrand has to be analytic, on a simple closed curve. The sentence now says that.
7. Typing \(1/z-i\sqrt{2}+1/z+i\sqrt{2}\) was marked right for the partial-fraction split of Example 6.14. Parentheses around a sum are no longer discarded. \(1/(2\sqrt{5})\), \((v\,dx+u\,dy)\), and \(u_x-v_y\) still match.

Left as is:

1. Once the gesture has landed, the picture claim names the value: \(2i\) at the half turn, \(\exp(2+i\pi/4)-1\) at eight steps, \(2\pi i\) and \(0\) on the two circles, and the green point inside the unit circle. Those values match the book. The blank under the picture is still the student's.
2. Within one pixel of the green circle the sentence says the integral of \(1/z\) is not defined. Exactly on the circle that is true. A hair inside, it is still \(2\pi i\).
3. A radius that is not a multiple of \(1/2\) prints a decimal rounded up, so the inequality stays true and is no longer the sharp \(1/R\). The play stops 1, 1.5, 2, 2.5, 3, 3.5, and 4 are exact.
4. Exercise 6.3.1 (b) and (d) are not cards. (a) and (c) match the answer key.

Keep: the six pictures, the page cites above, Example 6.1's \(-5/4\), the eight-step total beside \(\exp(2+i\pi/4)-1\), the semicircle \(-2/3\), Example 6.11's \(1/(2\sqrt{5})\), Cauchy's proof blanks, Examples 6.14–6.19 and 6.21 and 6.25, Theorem 6.12 on the dealt circle cards, and the computed generators.

## ux-veteran (chapter-6 batch 3)

Branch `cursor/chapter-6`, tip `c18dde6`. Preview https://ch6-preview.complexanalysis.pages.dev. The served `js/stations/chapter-6.js`, `js/app.js`, `js/stations/book.js`, `css/components.css`, and `index.html` match that commit. Headless Chrome, touch, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800, both themes. No console errors. No failed assets. `scrollWidth` was 390 and 1280.

The first screen of the chapter is the climb. At 390, light and dark, the square is 284×284 at y = 437, the claim is the quarter-turn sentence, and Play is 70×44 at y = 790, so it ends at 834 in the 844 window. At 1280 the square is 272×272 and Play ends at 756 in the 800 window. The same frames in the dark: paper `rgb(13, 18, 28)`, title `rgb(233, 237, 245)`. A drag on the green point moved it (viewBox cx 240 to 319) and left the claim on the move sentence. Play says Pause, and a second press says Play.

### Verdict

ANOTHER BATCH. The picture, the claim, and Play are on the first screen in both themes and at both widths, and the book drawer is a real list. A student still cannot see the next camp without crossing the cards, Back throws away the camp, and six answers on the phone are cut off mid-sentence. One batch is the five cuts below. After that, this lens rests.

### Ranked cuts

1. **The next camp and Stage complete sit with the picture, and the count sits on the flag.** On the phone the page is 26044px. Play on 6.1 ends at y = 834. "Go to 6.2" is at y = 2239 and Stage complete is at y = 2300, under the sheet and the cards. The summit is at y = 2108, in that same pile. On 6.2, Play is at y = 2959 and Go to 6.3 is at y = 7699. On 6.3 the tick is near the triangle, at y = 8776, and Go to 6.4 is at y = 16031, after the deformation cards. On 6.6, Play is at y = 22777 and "Back to the book" is at y = 25582, under the summit. "Next is 6.1. 0 of 6 stages." lives only under the first Play, at y = 851, so the 844 window does not show it. At 1280 that line ends at y = 799 in the 800 window, and a camp you jump to still has no count. Change: the flag line of the camp on screen carries the count ("6.2 · 0 of 6"). Under that camp's blanks, the summit, then the next-camp line and Go, then Stage complete. The sheet and the cards follow. 6.3 keeps the tick beside the triangle and moves Go up with it, before the deformation cards.

2. **Back returns to the camp you left.** Go to 6.2 scrolls to y = 2321 and leaves the hash on `#chapter-6`. History length stayed 5. Back from there opened `#book` at scroll 0. From 6.4, scrolled to y = 16069, The Book and then Back opened `#chapter-6` at scroll 0. The stage hash already exists, and scroll-padding is already 72px: after Go, the 6.2 flag is at y = 73, under the 56px header, and the title is on the screen. Change: Go sets `#chapter-6-6-2` (and the same for the other camps) so Back returns to the camp before it. A popstate back to this chapter restores the scroll it had. `window.scrollTo(0, 0)` on that return is the line that drops a student at 6.1.

3. **A choice on the phone shows the whole sentence.** Forty choices, all 44px tall. At 1280 every one fits. At 390, six clip inside the button. On `ch6-6.3-which-mc` the button is 288px wide and "Theorem 6.1, so parametrize both curves" is 378px, so the end is off the button. "Corollary 6.1, so the value is always \(2\pi i\)" overflows by 80px. "Theorem 6.6, deformation of contour" overflows by 58px. On `ch6-6.3-cg-mc` the phone shows "the integral equals the length of" and cuts the rest. On `ch6-6.6-which`, "Yes. Every entire function is constant" overflows by 58px. The Example 6.7 parametrization overflows by 1px, so that line already fits. Change: a choice wraps, and the minimum height stays 44. The formula line that already fits stays one line.

4. **The door into a camp is a 44px control, and a Later chapter says Later in the drawer.** On `#book` the first button is Walk Chapter 4, 163×44, and the status is "Next is §4.1, Exercise 3. 0 of 8 exercises." Walk Chapter 6 is a text link, 121×23, at y = 1845 on the phone and y = 1459 at 1280. The 6.1–6.6 rows on that node are text. The book drawer is the path that works: The Book, then chapters 1–7, each at least 44px tall. Chapter 6 is marked current on the laptop sidebar. Chapter 7 in that drawer opens `#chapter-7` on the roadmap, flag LATER, title at y = 97, clear of the header. The row in the drawer reads the same as chapter 6. Change: `#book-open-6` is the same `.btn` as Walk Chapter 4. Each section row links to its stage hash, `#chapter-6-6-1` and the rest. A drawer row that opens a Later card carries the Later flag the roadmap already prints.

5. **The way up on the chapter is 44px tall.** On the first screen, The Book is 69×17, at y = 81. The same link is 17px on chapter 4 and on chapter 5. "Back to the book" at the bottom of chapter 6 is 134×23. The 44px control with those words is the camp button on 6.6, and the drawer row The Book is 358×44. Change: `.book-kicker a` takes the 44px height a `.nav-link` already has, on chapters 4, 5, and 6 together. Chapter 6 keeps the kicker. It gets a hit a thumb can land on.

### What to keep

The first screen. At both widths, both themes, a student sees the lede, 6.1, the why, the gesture, the square, the claim "The integral has left 0. The real part and the imaginary part are still separate.", and Play. The blanks under that picture arrive empty, and each input is 44×266. Play says Pause while it runs, and the next press says Play.

The arrival on the next camp. Go to 6.2 puts the flag under the header, the why on the screen, the segment on the screen, and that camp's Play on the screen. Scroll-padding of 72px is why the title clears the bar. Chapter 1 and chapter 7 from the drawer do the same: the Later title sits at y = 97.

The book drawer and the laptop sidebar: chapters 1 through 7, every row at least 44px, chapter 6 current. The landing Places list still opens on The Book, 44px, as its first row. Buttons, Stage complete, Check, and the icon buttons in the header are 44px. The green point's hit is a 44px circle. The mark itself is 19px across on the 284px square, which is enough to see which point moves.

The type and the paper. The title is Iowan Old Style, 25.85px at 390 and 36px at 1280, weight 600. The lede is 16.8px. Light paper is `rgb(246, 243, 236)`, ink `rgb(26, 34, 48)`, muted `rgb(81, 91, 108)`. Dark paper is `rgb(13, 18, 28)`, ink `rgb(233, 237, 245)`, muted `rgb(166, 176, 195)`. The button radius is 6px and the card radius is 10px, the same on chapter 4 and chapter 5. The square stays the size that keeps Play on the first screen. Four colours, one gesture, one Play.

## Chapter 6, batch 4

Branch `cursor/chapter-6`, on top of `31fc16b` (reviewer product `a79c996`). Headless Chrome, fresh storage. 390×844 light and dark, 1280×800 light and dark. No console errors. No sideways scroll. Play ends at y = 834 in the 844 window and at y = 729 in the 800 window, in both themes.

The flag carries the count (`6.1 · 0 of 6`). Under each camp's blanks: the summit, Go, then Stage complete. The sheet and the cards follow. On 6.3, Go and the tick sit with the triangle, before the deformation beat and the cards. Go to 6.2 sets `#chapter-6-6-2` and leaves the 6.1 blanks mounted. Back from that hash returns to the scroll it left. From 6.4, The Book and then Back returns to the same scroll, with the 6.4 flag at y = 73.

A long choice wraps. "Theorem 6.1, so parametrize both curves" is the whole sentence. Example 6.7 stays one 44px line. The "Reach for" stem is gone on Theorem 6.6. The half-turn line latches at `2i` inside a thumb of the left side and stays after the point moves on. While Stage complete is disabled it says "Bring the point all the way around" or "Fill both lines". The eight-step claim does not print the sum or the exact value. The 6.3 line under the title does not say 0. "Constant" stays off the 6.6 sheet until that check is right. After the bend, the claim says the integral matches the straight segment. After every circle, the claim says the purple bound shrank to the origin, so the derivative is 0.

Walk Chapter 6 is a 163×44 button. Section rows link to `#chapter-6-6-1` and the rest. Drawer rows that open a Later card say Later, including Chapter 7. The Book and Back to the book keep their type size and take a 44px hit. A hair inside the green circle is inside, so the integral of \(1/z\) is not called undefined. A radius that is not a half-step prints the sharp \(1/R\), including \(4/7\) at 1.75 and \(500/503\) at 1.006. Exercise 6.3.1 (b) and (d) are on the card.

## Still open

A missed flash stays at the front. There is no longer schedule than that. The shared practice engine is not in the tree. Chapter 7 is named, marked Later, and is not a page. Chapters 8–11 stay Later on the book. The 6.5 claim still ends on the green point. The full-turn claim still says the integral is back at 0.

## unslop (chapter-6 batch 4)

Branch `cursor/chapter-6`, tip `02da336`. Preview https://ch6-preview.complexanalysis.pages.dev. The served `version.json` is that commit. Headless Chrome, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800 light, and the theme control into the dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. No product code was changed.

Light slop. The chrome is already this product: cream paper `rgb(246, 243, 236)`, dark paper `rgb(13, 18, 28)`, Iowan titles, one accent, the four teaching colours only on the marks. No emoji, no glow, no hue gradient, no exclamation mark. The same positions in both themes. The miss is words said twice, and a button stretched into a bar.

Direction, taken from the page that is already here. Product: a MAT 412 student drags one point and watches a complex integral change. Character: ink, exact, warm paper. World: a notebook page and a pencil on the plane. Moments: the six planes. Signature: the green point, the same green on every stage.

At 390, both themes, the square is 284×284 at y = 437. The claim is at y = 729. Play is 70×44 at y = 790 and ends at 834 in the 844 window. Above the square, two lines meet with no gap: the why at y = 332, 53px, "Purple is the total so far, while green walks the circle.", and the gesture at y = 385, 53px, "Drag the green point around the orange circle. Purple is the integral." At 1280 those two lines are 26px each, the square is 272×272 at x = 321 inside a card at x = 304 that is 952px wide, and Play ends at 729 in the 800 window. The phone page is 26423px. The laptop page is 20729px. A stage is 2092, 5471, 8677, 3154, 2908, and 3465px, with 2, 9, 12, 5, 4, and 4 cards.

A drag of the green point to the left side sets the phase to half. The claim stays "The total has left 0." The latched line "Half a turn: 2i." is a second paragraph at y = 842, 53px, under Play. On the unscrolled phone it starts 2px above the fold. The two read links move down to y = 897, under that line. Play says Pause while it runs, and the next press says Play.

A drag of the 6.5 point to the centre sets `data-where` to inside. The claim becomes "Inside, \(\dfrac{1}{2\pi i}\int \dfrac{z}{z-z_0}\,dz\) is the green point." The blank under the picture is "The formula returns". The worked paragraph already prints that formula.

Forty choices. None clip. Six wrap past 44px, and the shortest of those is 54. At 1280 each Check under a picture blank is 918×44, and the input beside it is 266×44.

## Verdict

ANOTHER BATCH. One batch, and it is the six cuts below. When the sentence above the square is one line, the half-turn line sits with the claim, and the citation list is off the picture, this lens rests.

## Ranked cuts

1. **The half-turn line sits with the claim, above Play.** After the drag, phase is `half`, the claim still reads "The total has left 0.", and "Half a turn: \(2i\)." is at y = 842, under the button that ends at 834. The read links follow it. Change: `#ch6-real-half` is inserted after the claim and before Play. The words stay, and the line still latches and still stays after the point moves on. The 53px comes off the top of the stack by cut 2, so Play's bottom stays inside 844 and inside 800.

2. **One sentence above the square, and it is the hand.** At 390 the why and the gesture are 53px each and both name purple. At 1280 they are one line each and they still name purple twice. On 6.2 the why says "Orange dots are pieces of the path" and the gesture says "Orange points are the eight samples." On 6.3 the why, the gesture, and the claim each say the integrand is analytic. On 6.6 the why and the gesture both say purple is the bound. On 6.4 the why opens with "6.3 gives \(0\)." The label "A pole is the next beat" sits over a gesture that already starts that picture. Change: 6.1 keeps "Drag the green point around the orange circle." 6.2 keeps "Drag the green point along the segment." 6.3 keeps the bridge from 6.2, and the gesture is "Play subdivides the triangle." 6.4's bridge is "Two ends use an antiderivative." 6.5 keeps both lines; they say different things. 6.6 is "Drag the green radius. Purple is the bound \(1/R\)." The pole label goes. The gesture under it stays.

3. **Between Play and the blank, one worked sentence.** At 390 the read list starts at y = 836, so the first screen ends on "Definition 6.1, page 163". Under it: the label Worked example, a source tag that repeats Definition 6.1, page 163, then "From \(0\) to \(\pi\), integrate \(e^{it}\).", which is the blank. On 6.3 five links, 141px, sit between Play and "The integral over the triangle is". At 1280, both themes, the first screen ends on those two 6.1 links, beside the empty right of the card. Change: the read list under the picture goes. Each For the exam line is already that citation, and the pin on the line is the link. The 6.1 worked paragraph goes; the two blanks are that example. On 6.2 through 6.6 the worked sentence stays when it is not the blank's prompt. One source tag remains, on the sheet.

4. **Check is the button Play already is.** At 1280 the half-turn Check, the full-turn Check, and the 6.2 Check are each 918×44, under an input that is 266×44. The same flex fills the phone column, so two blanks are four bars. Change: `.ch6-student .problem-actions .btn` keeps the 44px height and takes its content width. It does not grow to the row.

5. **The button says the next camp, and the 6.3 summit is not the sheet.** The go row is "Next camp is 6.2, contours." and "Go to 6.2", 112px on the phone and one card on the laptop. The same pair sits on 6.3, 6.4, and 6.5. The 6.3 summit is "Analytic inside and on a simple closed curve: Theorem 6.5, page 183, says the integral is \(0\)." The first sheet line is that sentence. Change: the next-camp paragraph goes on 6.1 through 6.5. The button stays. On 6.6 the paragraph stays, because it names Chapter 7 and the button says "Back to the book". The 6.3 summit drops "says the integral is \(0\)". The sheet keeps the statement.

6. **The inside claim stops before the blank.** With the point at the centre the claim is "Inside, \(\dfrac{1}{2\pi i}\int \dfrac{z}{z-z_0}\,dz\) is the green point." The worked paragraph prints that formula. The blank asks what the formula returns. Change: the inside claim is "Inside, the formula applies." The formula stays in the worked sentence. "The green point" stays the words the student writes. The edge claim and the outside claim stay as they are.

## What to keep

The six planes, the four colours on the marks, and the one clock. Play on the first screen in both themes and at both widths. Play says Pause while it runs, and the next press says Play and leaves the point where it stopped. The square stays 284px on the phone and 272px on the laptop, the size that keeps Play inside 844 and inside 800. The blank paper to the right of that square is the chapter card.

The claim that flips: "The total has left \(0\)." and, at the full turn, "A full turn brings the integral back to \(0\)." The blanks arrive empty. Stage complete stays disabled, and the line under it names the missing piece. The half-turn sentence stays on the page after the point moves on. The eight-step claim leaves the exact value in the blank. The bent claim says the integral matches the straight segment. The finished radius claim says the purple bound shrank to the origin.

The kicker, the flag, and For the exam. They are the book path: uppercase, tracked, the same on chapter 4 and chapter 5. The drawer, chapters 1 through 7, Later on the rows that open a Later card, including Chapter 7. Walk Chapter 6 at 163×44. Choices that wrap, with none cut off. The cards. This lens does not cut a drill. The source tag on a card stays. No new type, no new colour, no new chrome.

## ux-veteran (chapter-6 batch 4)

Branch `cursor/chapter-6`, tip `02da336`. Preview https://ch6-preview.complexanalysis.pages.dev. The served `js/stations/chapter-6.js`, `js/stations/ch6-pictures.js`, `js/stations/ch6-cards.js`, `js/stations/book.js`, `js/app.js`, `js/book/ch6-math.js`, `css/components.css`, `css/theme.css`, and `index.html` match that commit. Headless Chrome, touch, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800, light and dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. The phone page is 26423px. The laptop page is 20729px.

### Verdict

ANOTHER BATCH. The five cuts from batch 3 are on the page. A student on a phone sees the camp, the picture, and Play, opens a 44px list of chapters 1–7, and comes back to the camp they left. The half-turn line that batch asked to keep is under Play, and 2px of it is inside the 844 window. One batch is the three cuts below. When that line sits with the claim and Play is still on the first screen, this lens rests.

### What the walk showed

First screen, 390, light and dark. The header is 56px. The kicker is The Book. The title is Iowan Old Style, 25.85px, weight 600. The lede is the six stages. The flag reads `6.1 · 0 OF 6`. The why and the gesture are both on the screen. The square is 284×284 at y = 437. The claim is "The total has left 0." Play is 70×44 at y = 790 and ends at 834 in the 844 window. Dark paper is `rgb(13, 18, 28)`. The title and the claim are `rgb(233, 237, 245)`. Play sits at the same place. At 1280 the square is 272×272 and Play ends at 729 in the 800 window, in both themes. The sidebar is that same chapter list, the menu button is hidden, and Chapter 6 is the current row, on screen.

Play says Pause. A second press says Play. The run finishes on "A full turn brings the integral back to 0." The claim for that sentence ends at y = 782. Play ends at 834. The half-turn line latches during the run and is still up at the end, at y = 842, 53px tall, so the 844 window shows 2px of "Half a turn: \(2i\)."

The drawer, light and dark. Places is 44×44. The list is The Book and chapters 1–7, each row 44px, and the whole list fits. Chapters 1, 2, 3, and 7 say Later. Chapters 8–11 stay off this list. Chapter 6 is the marked row. The page behind the drawer stays put (`overflow: hidden`, and `#view` is inert). Chapter 7 opens the book on the Later card. The flag is at y = 73 and the title is at y = 97, under the 56px header.

Back. From `#chapter-6` at scroll 1200, Go to 6.2 sets `#chapter-6-6-2`, leaves the 6.1 blank mounted, and puts the 6.2 flag at y = 73. Back returns to `#chapter-6` at scroll 1200. From 6.4, flag at y = 73 and scroll 16466, The Book in the drawer opens `#book` at scroll 0. Back returns to `#chapter-6-6-4` at scroll 16466, with the flag at y = 73.

The Book kicker draws at 69×19. The hit around those words runs from y = 68 to y = 108, and the title takes the point at y = 112. The same kicker on chapter 4, sampled in the dark, is 69×19 and takes 10 of 12 probes across a 44px band. Back to the book at the bottom draws at 134×26 and takes a 44px band. Walk Chapter 6 is 163×44. The six section rows go to `#chapter-6-6-1` through `#chapter-6-6-6`, and each link is at least 44px tall.

Choices. "Theorem 6.1, so parametrize both curves" is the whole sentence, 54px tall. "Corollary 6.1, so the value is always \(2\pi i\)" wraps the formula onto a second line, 88px, and the formula is on the button. The four Example 6.7 lines stay one 44px row. The longest is 289px in a 288px box.

Stage complete on 6.1 is 44px and disabled. The line under it says "Bring the point all the way around" before the full turn, and "Fill both lines" after it. On each camp the flag carries the count, and the summit, Go, and Stage complete sit under that camp's blanks. The sheet and the cards follow. On 6.3, Go to 6.4 and "Subdivide the triangle" share the screen with "A pole is the next beat" and the start of the green circle.

Style. Light paper `rgb(246, 243, 236)`, ink `rgb(26, 34, 48)`, muted `rgb(81, 91, 108)`. Dark paper `rgb(13, 18, 28)`, ink `rgb(233, 237, 245)`, muted `rgb(166, 176, 195)`. The button radius is 6px and the card radius is 10px. Chapter 4 and chapter 5, sampled in the dark after the same theme control, use that Iowan title at 25.85px, that lede at 16.8px, that kicker, and that 10px card.

### Ranked cuts

1. **The half-turn line sits with the claim, and one sentence stays above the square.** After Play the claim ends at y = 782, Play ends at 834, and "Half a turn: \(2i\)." starts at y = 842. The why and the gesture are 53px each above the square, and both name purple. Moving the half-turn line above Play without freeing a line would push Play past 844. Change: 6.1 keeps "Drag the green point around the orange circle. Purple is the integral." The why line goes. `#ch6-real-half` is inserted after the claim and before Play. It still latches, and it still stays after the point moves on. Play's bottom stays inside 844 and inside 800.

2. **The page number stays on the section's row.** At 390 the Chapter 6 doors are the right hashes and at least 44px, and four of them drop the page onto a line by itself. The 6.2 link is 283px wide, so "p. 167" wraps to y = 1636 under a link that ended at 1630, and the row grows from 44 to 76. 6.3 does the same with "p. 181". 6.4 and 6.6 wrap the title, then put "p. 193" and "p. 203" on their own right-aligned line. "p. 203" sits in the gap above Walk Chapter 6. 6.1 and 6.5 keep the page beside the title. Change: the row does not wrap. The title flexes and may wrap inside the link. The page stays on the right of that row.

3. **A flashcard says which card it is.** Section 6.1 opens one deck of two flashes. Show the back opened the definition. Missed, 44×141, closed the back and left the same front. The full-turn card stayed behind it, and the card gave no sign that the press landed. Change: the heading reads "Flashcard · 1 of 2", and Missed adds one line, "Still this card." Recalled can keep moving to the next card.

### What to keep

The first screen, both themes, both widths. The lede, `6.1 · 0 of 6`, the square, "The total has left 0.", and Play. The four colours on the marks. Play, Pause, Play. The half-turn sentence stays after the point moves on.

The drawer. Chapters 1–7, Later on the chapters that are still cards, Chapter 6 marked, every row 44px, the page behind it held still. Chapter 7 landing with LATER at y = 73.

Back. Go writes the camp hash and returns to the scroll you left. The Book from the drawer, then Back, returns to that camp with the flag under the header.

The Book kicker and Back to the book, the words at the size they were, the hit at 44px. Walk Chapter 6 at 163×44. The section names as the doors.

The summit, Go, and Stage complete under the blanks, with the reason on the disabled tick: "Bring the point all the way around", "Fill both lines", "Take all eight steps", "Subdivide the triangle", "Bend the path", "Bring the point inside", "Cross every circle". On 6.3 the pole label and the green circle share the screen with Go.

Wrapped choices, the whole sentence, and Example 6.7 on one 44px line. The type, the paper, the 6px button, the 10px card.

## reviewer (Ch6 batch 4)

Branch `cursor/chapter-6`, draft PR #45, reviewed at `02da336` against Howell & Mathews, Complex Analysis, 202 Updated Edition (the 471-page PDF at complexanalysis.org). The HTML edition numbers the same statements differently. Each anchor used on the chapter was opened and is present. Preview `https://ch6-preview.complexanalysis.pages.dev` still serves `02da336`. The fixes below are on this branch, checked on a local page.

Verdict: **ACCEPT WITH FIXES**.

Checked against the printed pages, again, including the batch 4 cards. Section openers 163, 167, 181, 193, 197, and 203 match the contents. Definition 6.1 and Example 6.1 are page 163, and \(\int_0^1(t-i)^3\,dt=-5/4\). Definition 6.2 and Example 6.6 are page 170. The eight-step midpoint sum rounds to \(4.23+5.20i\), and the exact value is \(\exp(2+i\pi/4)-1\). Theorem 6.1 and Example 6.7 are page 172. Theorem 6.3 and Example 6.11 are page 177, and the book's bound is \(1/(2\sqrt{5})\). Exercise 3 of §6.2 is page 178, and the key on page 443 gives \(-2/3\). Exercise 5 is page 179, key \(-32i\) and \(-8\pi i\). Exercise 9 is page 180, key \(2\pi i\) and \(0\). Theorem 6.5 is page 183. Cauchy's proof and Equation (6.28) are page 184: the imaginary integrand is \(v\,dx+u\,dy\), and Green produces \(u_x-v_y\). Example 6.12 is page 186. Theorem 6.6 is page 187. Corollary 6.1 is page 188. Examples 6.14, 6.15, and 6.16 are pages 189, 190, and 190, values \(4\pi i\), \(2\pi i\), and \(-6\pi i\), with the figure-eight signs from page 191. §6.3 Exercise 1 is page 191. The key gives (a) \(\pi i\) and (c) \(0\). (b) has poles at \(-1\pm i\), both outside the unit circle, so the integral is \(0\). (d) \(\operatorname{Log}(z+5)\) is analytic inside and on that circle, so the integral is \(0\). Exercise 2 is \(2\pi i\). Exercise 3 is \(0\). Exercise 4(a) on \(|z-1|=2\) is \(0\), and 4(b) on \(|z-1|=1/2\) is \(2\pi i\). Theorem 6.8 is page 193. Theorem 6.9 is page 194, and the ends \(-1-i\) and \(3+i\) give \(4+2i\). Examples 6.17, 6.18, and 6.19 are page 195: \(1+i\), \(-\sin 1+i\sinh 1\), and \(\operatorname{Log}(z_2)-\operatorname{Log}(z_1)\). The statement of Example 6.18 is \(\sinh 1\). Theorem 6.10 is page 197. Example 6.21 is page 198, \(2\pi i\, e\). Theorem 6.12, equation (6.48), is page 199. Example 6.25 is page 200, \(-4\pi/(3e)\). Theorem 6.13 is page 203. Theorem 6.17 is page 205, \(|f^{(n)}(z_0)|\le n!M/R^n\). Theorems 6.18 and 6.19 are page 206. Liouville's proof sends \(R\) to infinity before \(f'(z_0)=0\).

Seeds 1 through 80 of the circle, segment, and Cauchy-formula generators accept their own answers. Segment values match an 8000-step quadrature. Three thousand radii from 1 to 4 print a bound at least \(1/R\), including \(4/7\) at 1.75 and \(500/503\) at 1.006. `node tools/check_vectors.mjs` is 234/234. `node tools/fractal-smoke.mjs` passed. `node kit/smoke.mjs` passed. Live code does not import `kit/`. `js/core/map-route.js` matches the kit copy.

Local page, fresh storage, headless Chrome. 390×844 light, then dark. Then 1280×800 light, then dark. No console errors. No failed assets. `scrollWidth` was 390 and 1265. Play is 44px and ends at y = 834 in the 844 window and at y = 729 in the 800 window, both themes. The flag reads `6.1 · 0 of 6`. Forty choices are at least 44px and do not clip. A wrong half-turn blank stays covered, and `2i` locks. One step inside the green circle says the pole is inside. Go to 6.2 sets `#chapter-6-6-2` and leaves the filled blank mounted. Walk Chapter 6 is 163×44. The 6.1 section row is `#chapter-6-6-1`. From 6.4, The Book and then Back returns to the same scroll. The drawer marks Chapter 7 Later. Eighteen arrow steps reach a full turn, and the claim says the integral is back at 0.

What was wrong, and the change:

1. After the six pictured circles, at radius 3.5, the claim said the purple bound had shrunk to the origin and the derivative was 0. Theorem 6.17 on that circle is \(|f'|\le 1/3.5\). The book's proof needs every radius in the plane. The claim now says the mark is still \(1/R\), and these circles do not send the derivative to 0. The summit says the same until the blank is filled.
2. The 6.4 sheet said an analytic integrand does not care which path joins the ends. Theorem 6.9 needs a simply connected domain. \(1/z\) from \(-i\) to \(i\) is the counterexample. The line now names that hypothesis.
3. The 6.5 sheet quoted equation (6.48) and then said "Divide by \(n!\)". The formula multiplies by \(n!\). The extra sentence is gone. The integral recipe stays on the Example 6.25 card: divide by \(n!\), then multiply by \(2\pi i\).
4. The half-turn line said "Half a turn: \(2i\)" as soon as the point was within 0.8 rad of the left side. There the integral is about \(-0.72+1.70i\). The line now says a half turn, the left side, integrates to \(2i\).

Left as is:

1. A full turn of \(e^{it}\) is 0, and the claim says so. That is the blank.
2. Inside the unit circle, \(\frac{1}{2\pi i}\int z/(z-z_0)\,dz\) is the green point. Outside, that integral is 0. Both match Theorem 6.10 for \(f(z)=z\). The claim still ends on the green point.
3. After the triangle is subdivided, the claim quotes Theorem 6.5 and says the integral is 0. That is the blank, and it is the theorem.
4. The fundamental-theorem card stops when \(1/P\) is constant. The contradiction with degree at least 1 is the next sentence of the proof on page 206.

Keep: the six pictures, the page cites above, the answer-key values, Example 6.1's \(-5/4\), the eight-step total beside \(\exp(2+i\pi/4)-1\), the semicircle \(-2/3\), Example 6.11's \(1/(2\sqrt{5})\), Cauchy's three proof blanks, Examples 6.14–6.19 and 6.21 and 6.25, Exercise 6.3.1 (a)–(d), the sharp \(1/R\) bounds, and the computed generators.

## Chapter 6, batch 5

Branch `cursor/chapter-6`, on top of `6c49527`. Headless Chrome, fresh storage. 390×844 light and dark, 1280×800 light and dark. No console errors. No failed assets. `scrollWidth` was 390 and 1265.

The 6.1 why line is gone. One gesture sits above the square: "Drag the green point around the orange circle. Purple is the integral." The square is 284px on the phone and 272px on the laptop. Resting Play ends at y = 781 in the 844 window and at y = 703 in the 800 window, both themes. After the point reaches the left side, "A half turn, the left side, integrates to \(2i\)." sits between the claim and Play. On the phone that sentence wraps onto "\(2i\)." and Play ends at y = 842. On the laptop it is one line and Play ends at y = 737. Play says Pause while it runs, and the next press says Play.

A full turn says the point is home. Inside the unit circle the claim is "Inside, the formula applies." Outside, the integral is still 0. After one subdivision the triangle claim is "The midpoints are in." The 6.3 summit names Theorem 6.5, page 183, and does not print 0. The sheet still states the integral.

The 6.1 deck heading is "Flashcard · 1 of 2". Missed closes the back, stays on that card, and adds "Still this card." Check under a picture blank is 85×44. Section rows on the book keep the page on the right of the link; 6.4 and 6.6 wrap the title and stay one row. "Next camp is …" remains only on 6.6, naming Chapter 7. The read lists under the pictures are gone. 6.1 has no worked paragraph. 6.2 through 6.6 keep one worked sentence. Theorem 6.19, page 206, adds the step after \(1/P\) is constant: degree 0 contradicts degree at least 1, so \(P\) has a zero.

Deferred: the shared practice engine is another loop, and this chapter still renders `data/practice/ch6.json` with the local card. Chapter 7 is a Later card, not a page. Chapters 8–11 stay off this loop.

## taste-skill (chapter-6 batch 5)

Branch `cursor/chapter-6`, tip `f02aafe`. Preview https://ch6-preview.complexanalysis.pages.dev. `version.json` still says `fa0f69f`. `index.html`, `js/app.js`, `js/stations/chapter-6.js`, `js/stations/ch6-pictures.js`, `js/stations/ch6-cards.js`, `js/stations/book.js`, `js/book/ch6-math.js`, and `css/components.css` match `f02aafe` byte for byte. Headless Chrome, fresh storage. 390×844 light, then dark. Then 1280×800 light, then dark. The theme was `mv:theme`, set before load. No console errors. No failed assets. `scrollWidth` was 390 and 1280. No product code was changed.

The page is already this product. Cream paper `rgb(246, 243, 236)`, dark paper `rgb(13, 18, 28)`, Iowan titles, one accent on Walk and Go, the four teaching colours on the marks. The kicker, the flag, and For the exam stay. This pass is the sentences that share a size, and the one answer that has climbed into the claim.

At rest, both themes, Play is on the first screen. At 390 the square is 284×284 at y = 385, the claim "The total has left 0." is one line of text in a 53px box (the phone rule `min-height: 52.7px` on `.exp-claim`), and Play is 70×44 ending at y = 781. At 1280 the square is 272×272, the claim is 26px, and Play ends at y = 703. The phone page is 25308px. The laptop page is 19976px.

### Verdict

ANOTHER BATCH. One batch, the six cuts below. When the claim stops before the blank, one sentence sits above the square, and the worked line is that one sentence, this lens rests.

### Ranked cuts

1. **The half-turn line stops before \(2i\), and it is one line.** Six steps to the left side, both themes. The claim stays "The total has left 0." Under it, "A half turn, the left side, integrates to" and then "\(2i\)." alone. That second line is the blank, "From 0 to \(\pi\) the integral is". At 390 the half line is 324×53 and Play ends at y = 842 in the 844 window. At 1280 the same sentence is one 27px line, still printing \(2i\), and Play ends at y = 737. A full turn says "A full turn brings the point home." and leaves the half line up. Outside the unit circle the claim is "Outside, that integral is 0." Change: the latched line is "The point is on the left side." \(2i\) stays in the blank. The line is one line at 390, and it does not take the two-line min-height, so Play's bottom stays at the resting 781 and 703. The outside claim is "Outside, the formula does not apply."

2. **One sentence above the square.** At 390, both themes, 6.2 stacks two 17px lines: "Orange dots are pieces of the path. Add them up." and "Drag the green point along the segment. Orange points are the eight samples." 6.3's bridge and its gesture both say the integrand is analytic. 6.4 opens "6.3 gives 0 on a closed curve." 6.5 opens "This formula returns the inside value." above the blank "The formula returns". 6.6 stacks "Purple is a bound on the derivative" and "purple is the bound \(1/R\)". Change: 6.2 keeps the drag sentence. 6.3 keeps "6.2 computes one path. This camp is a closed curve." and the gesture is "Play subdivides the triangle." 6.4 is "Two ends use an antiderivative." 6.5 is "6.4 needs an antiderivative." 6.6 is "Drag the green radius across the circles. Purple is the bound \(1/R\)."

3. **The worked line is one sentence, and it is the step.** On 6.2 the paragraph under Play prints \(z(t)=(2+i\pi/4)t\) for \(0\le t\le 1\), and that string is the first choice, 44px, in the cards below. The blank under the paragraph is "The exact value is". On 6.5 the claim is "Inside, the formula applies." and the worked paragraph prints the formula and then "It applies while the green point stays inside." On 6.6 the worked paragraph ends "One circle is not every circle." The summit under the blank is that sentence. The blank is "\(f\) is". On the pole picture the worked line says Corollary 6.1 "is the power \(-1\)" and the blank is "The integral of \(1/z\) over the green circle is". Change: 6.2 stops at the segment from 0 to \(2+i\pi/4\), then "multiply by \(z'(t)\) and integrate in \(t\)." 6.5 keeps the formula and drops the second sentence. 6.6 keeps Theorem 6.17 and drops the summit's sentence. 6.3 keeps the two circles and \(1/z\), and the power \(-1\) stays on the sheet.

4. **The flash heading is the count. The question is the line.** The 6.1 deck's `h3` is "Flashcard · 1 of 2", 18.4px, weight 600. Under it the source tag names Definition 6.1, page 163, and the prompt starts "Definition 6.1. What is". Missed closes the back, stays on that card, and adds "Still this card." The same heading on a deck of one card reads "Flashcard · 1 of 1" (Theorem 6.5, Theorem 6.9, Theorem 6.18, Theorem 6.19). Change: two or more cards say "1 of 2" in the flag's size. The `h3` is the question, and the question leaves the cite's name on the source tag. A single card has no count. "Still this card." stays. The source tag stays.

5. **The page number shares the first line of the row.** At 390, light and dark, 6.2, 6.3, 6.4, and 6.6 wrap the title to 53px and center the page on that box, so "p. 167" sits beside "Integrals", "p. 181" beside "Theorem", "p. 193" beside "of Integration", and "p. 203" beside "Liouville". At 1280 every Chapter 6 row is one 44px line and the page is on the right. On the same book, at 390, section 4.3 is 85px and "p. 118" is on its own line under the title. Change: the Chapter 6 row aligns the page to the first line. The title wraps under the name. The page stays nowrap on the right. Chapter 4 uses that same row.

6. **The pole label goes.** Above the green circle, "A POLE IS THE NEXT BEAT" is 12.48px, weight 700, letter-spacing 0.75px, uppercase. The next line is "Drag the green handle. The integrand is \(1/z\)." Change: the label goes. The gesture stays. For the exam keeps its label.

### What to keep

The six planes, the four colours on the marks, and the one clock. At rest, Play on the first screen in both themes and at both widths, 70×44, ending at 781 and at 703. The square stays 284px on the phone and 272px on the laptop. The blank paper to the right of that square is the chapter card.

The claims that already stop: "The total has left 0.", "A full turn brings the point home.", "The sum has used 0 of 8 steps.", "The midpoints are in.", "Inside, the formula applies." The blanks arrive empty. Stage complete stays disabled, and the line under it says "Fill both lines". Check under a picture blank is 85×44. "Next camp is Chapter 7, Taylor and Laurent series." is the only next-camp line, and the button says "Back to the book". 6.1 has no worked paragraph.

The kicker, the flag `6.1 · 0 of 6`, and For the exam. They are the book path. The drawer, chapters 1 through 7, Later on the rows that are still cards. Walk Chapter 6. The section names as the doors, with the page on the row. "Still this card." after Missed. No new type, no new colour, no new chrome.

## reviewer (Ch6 batch 5)

Branch `cursor/chapter-6`, draft PR #45, reviewed at `f02aafe` against Howell & Mathews, Complex Analysis, 202 Updated Edition (the 471-page PDF at complexanalysis.org; title page is the 202 Updated Edition). Preview `https://ch6-preview.complexanalysis.pages.dev` serves the chapter files from that tip. Headless Chrome, fresh storage. 390×844 light then dark, then 1280×800 light then dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280.

Verdict: **ACCEPT WITH FIXES**. The fixes are on this branch.

Checked against the printed pages. Section openers 163, 167, 181, 193, 197, and 203 match the contents. Definition 6.1 and Example 6.1 are page 163, and \(\int_0^1(t-i)^3\,dt=-5/4\). Definition 6.2 and Example 6.6 are page 170. The eight-step midpoint sum on page 171 rounds to \(4.23+5.20i\), and the exact value is \(\exp(2+i\pi/4)-1\). Theorem 6.1 and Example 6.7 are page 172. Theorem 6.3 and Example 6.11 are page 177, bound \(1/(2\sqrt{5})\). Exercise 3 of §6.2 starts on page 178, and the key on page 443 gives \(-2/3\) for the semicircle. Exercise 5 is page 179, key \(-32i\) and \(-8\pi i\). Exercise 9 is page 180, key \(2\pi i\) and \(0\). Theorem 6.5 is page 183: analytic in a simply connected domain, simple closed contour, integral \(0\). Cauchy's proof and Equation (6.28) are page 184. Example 6.12 is page 186. Theorem 6.6 is page 187. Corollary 6.1 is page 188. Examples 6.14, 6.15, and 6.16 are pages 189, 190, and 190, values \(4\pi i\), \(2\pi i\), and \(-6\pi i\). §6.3 Exercises 1–4 start on page 191. The key gives 1(a) \(\pi i\) and 1(c) \(0\); 1(b) and 1(d) are \(0\); Exercise 2 is \(2\pi i\); Exercise 3 is \(0\); Exercise 4(a) is \(0\) and 4(b) is \(2\pi i\). Example 6.9, page 194, is \(4+2i\). Theorem 6.9, equation (6.43), is page 194 and requires a simply connected domain. Examples 6.17, 6.18, and 6.19 are page 195: \(1+i\), \(-\sin 1+i\sinh 1\), and \(\operatorname{Log}(z_2)-\operatorname{Log}(z_1)\). Theorem 6.10, equation (6.44), is page 197. Example 6.21 is page 198, \(i2\pi e\). Theorem 6.12, equation (6.48), is page 199 and multiplies by \(n!\). Example 6.25 is page 200, \(-4\pi/(3e)\). Theorem 6.13 is page 203. Theorem 6.17 is page 205, \(|f^{(n)}(z_0)|\le n!M/R^n\) for \(n\ge 1\). Theorems 6.18 and 6.19 start on page 206. The algebra proof reaches degree 0 on page 207.

The named regressions hold on the preview. After every pictured circle the claim is still \(1/R\), and it does not send the derivative to 0. The 6.4 sheet names a simply connected domain. Equation (6.48) on the 6.5 sheet multiplies by \(n!\). The half-turn line says the left side integrates to \(2i\), and it sits between the claim and Play. Theorem 6.19 has the step after \(1/P\) is constant. A full turn says the point is home. Inside, the claim is "Inside, the formula applies." After one subdivision the triangle claim is "The midpoints are in." The 6.1 deck reads "Flashcard · 1 of 2", and Missed adds "Still this card." Every practice anchor is present in the HTML edition. `node tools/check_vectors.mjs` is 234/234. `node tools/fractal-smoke.mjs` and `node kit/smoke.mjs` passed. Live code does not import `kit/`. `js/core/map-route.js` matches the kit copy.

What was wrong, and the change:

1. The 6.4 summit said an analytic integrand is the antiderivative at the ends, with no domain. Theorem 6.9, page 194, needs a simply connected domain. \(1/z\) from \(-i\) to \(i\) is the counterexample. The summit now names that hypothesis.
2. The 6.4 why said 6.3 gives 0 on a closed curve. A closed integral is 0 when the integrand is analytic in a simply connected domain, not on every closed curve. The line now says two ends, in a simply connected domain, use an antiderivative. A taste note that landed during this review asks that line to drop back to "Two ends use an antiderivative." That cut removes the hypothesis. Keep "simply connected" on the why and on the summit.

Left as is:

1. A segment card's note names Theorem 6.1, page 172, for the parametrization and then says the antiderivative is evaluated at the ends. The evaluation is Theorem 6.9. The value the card grades is still the antiderivative at the ends.
2. The full-turn phase is the integral within 0.01 of 0, so the positive real axis reads "A full turn brings the point home." That point is also the start of the parametrization.
3. The 6.5 blank accepts "the green point" from any position. The outside claim correctly says the integral is 0, and Stage complete still waits until the point is inside.

Keep: the six pictures, the page cites above, the answer-key values, Example 6.1's \(-5/4\), the eight-step total beside \(\exp(2+i\pi/4)-1\), the semicircle \(-2/3\), Example 6.11's \(1/(2\sqrt{5})\), Cauchy's three proof blanks, Examples 6.14–6.19 and 6.21 and 6.25, Exercise 6.3.1 (a)–(d), Theorem 6.12 on the dealt circle cards, the sharp \(1/R\) bounds, and the computed generators.

## ux-veteran (chapter-6 batch 5)

Branch `cursor/chapter-6`, tip `f02aafe`. Preview https://ch6-preview.complexanalysis.pages.dev. The served `js/stations/chapter-6.js`, `js/stations/ch6-pictures.js`, `js/stations/ch6-cards.js`, `js/stations/book.js`, `js/app.js`, `css/components.css`, and `css/theme.css` match that commit. The preview's `version.json` still names `fa0f69f`. Headless Chrome, touch, fresh storage. 390×844 light, then the theme control into the dark. Then 1280×800, light and dark. No console errors. No failed assets. `scrollWidth` was 390 and 1280. No product code was changed. The phone page is 25308px and grows to 25369px once the half-turn line is open. The laptop page is 19976px and grows to 20010px.

### Verdict

ANOTHER BATCH. The drawer, the book doors, the camp arrival, and the type are the page from batch 4. On a phone the half-turn sentence appears above Play during the run, Pause lands on the fold, and Back from the book then tucks the camp flag under the header. One change, below. After Play keeps a line of air and that Back meets the flag, this lens rests.

### What the walk showed

First screen, 390, light and dark, before the latch. The header is 56px. The Book kicker draws at 69×19, and the hit runs from y = 68 to y = 108. The title is Iowan Old Style, 25.85px, weight 600. The lede is the six stages. The flag reads `6.1 · 0 OF 6`. One gesture sits above the square: "Drag the green point around the orange circle. Purple is the integral." The square is 284×284 at y = 385. The claim "The total has left 0." is one line of text inside a 53px box. Play is 70×44 at y = 737 and ends at 781, 63px inside the 844 window. The blank prompt "From 0 to π the integral is" is on that screen. Dark paper is `rgb(13, 18, 28)`. The title and the claim are `rgb(233, 237, 245)`.

The latch. A drag of the green point to the left side sets the phase to half. "A half turn, the left side, integrates to \(2i\)." sits between the claim and Play, wraps, and puts \(2i\). on its own line. That box is 53px. Play moves from a bottom of 781 to a bottom of 842. Two pixels of the card remain under the border, in both themes. Pressing Play says Pause. While Pause is up, the line opens and the button is the one at y = 798. A full turn changes the claim to "A full turn brings the point home." The half-turn line stays. Play stays at 842. A second press says Play.

At 1280, both themes, the square is 272×272. The half-turn sentence is one line. Resting Play ends at 703. After the latch, and after a full turn, Play ends at 737, 63px inside the 800 window. The blank prompt stays on that screen.

Back inside the chapter. From `#chapter-6` at scroll 1200, Go to 6.2 sets `#chapter-6-6-2`, puts the 6.2 flag at y = 73, and leaves the 6.1 blank mounted. Back returns to `#chapter-6` at scroll 1200.

Back from the book, with the line closed. From 6.4, flag at y = 73 and scroll 15649, The Book in the drawer opens `#book` at scroll 0. Back returns to `#chapter-6-6-4` at that scroll, with the flag at y = 73 and the title at y = 96.

Back from the book, after the latch. The line is open. Go to 6.4 leaves the flag at y = 73 and the scroll at 15710. The Book, then Back, returns to that hash and that scroll. The picture has remounted: the phase is move, and the line is hidden. The flag is at y = 12 and the title is at y = 35, both under the 56px header.

Camps. `#chapter-6-6-1` through `#chapter-6-6-6` each put the flag at y = 73 and the title at y = 96. Play is on that screen. On the phone the bottoms are 664, 682, 682, 682, 656, and 709. At 1280, 6.2, 6.3, and 6.6 end at 591 or 592. The flag carries the count. The summit, Go, and Stage complete sit under the blanks. The sheet and the cards follow. On 6.3, Go to 6.4 starts at y = 866, below the 844 window, and "A pole is the next beat" is the next block. "Next camp is Chapter 7, Taylor and Laurent series." is the only next-camp paragraph, on 6.6. After this walk, `453e317` rewrote the 6.4 why and the 6.4 summit so both name a simply connected domain. On the walked page the 6.4 Play ended at 682, with 162px under it, so that longer line stays below the first screen of the camp.

Drawer, light and dark. Places is 44×44. The list is The Book and chapters 1–7, each row 44px, and the list fits. Chapters 1, 2, 3, and 7 say Later. Chapter 6 is the current row. The page behind the drawer stays put (`overflow: hidden`, and `#view` is inert). Chapter 7 opens the book on the Later card. The flag is at y = 73 and the title is at y = 96.

The book. Walk Chapter 6 is 163×44. The six section rows go to `#chapter-6-6-1` through `#chapter-6-6-6`. The title wraps inside 6.2, 6.3, 6.4, and 6.6, and the page stays on the right of that row. 6.1 is 44px and reads Next beside p. 163, and the two do not overlap. Back to the book draws at 134×26. The hit on those words runs from y = 652 to y = 692.

Choices. Forty-four of them, every one at least 44px, none clipped. Six wrap. "Theorem 6.1, so parametrize both curves" is 54px. "the integral equals the length of \(C\)" is 88px. Check is 85×44. The picture inputs are 266×44. The deck heading is "Flashcard · 1 of 2". Show the back opens the definition. Missed is 141×44, closes the back, stays on that card, and adds "Still this card."

Stage complete is 44px and disabled. The line under it says "Bring the point all the way around". The other camps say "Take all eight steps", "Subdivide the triangle", "Bend the path", "Bring the point inside", and "Cross every circle".

Style. Light paper `rgb(246, 243, 236)`, ink `rgb(26, 34, 48)`, muted `rgb(81, 91, 108)`. Dark paper `rgb(13, 18, 28)`, ink `rgb(233, 237, 245)`, muted `rgb(166, 176, 195)`. The button radius is 6px and the card radius is 10px. Chapter 4 at 1280 and chapter 5 at 390, sampled in the dark, use that Iowan title, that lede at 16.8px, that kicker, and that 10px card. The laptop sidebar is the same chapter list, the menu button is hidden, and Chapter 6 is the current row, on screen.

### Ranked cuts

1. **Keep the half-turn line's place, and let the 6.1 claim be one line.** On the phone, light and dark, resting Play ends at 781. During Play the line latches, Pause jumps to a bottom of 842, and it stays there through "A full turn brings the point home." The claim is one line of text in the 53px box `.exp-claim` reserves on a phone. That empty line, plus the wrapped \(2i\)., is the difference between 63px of air and 2px. The blank prompt that was on the resting screen starts at y = 842. After that latch, Go to 6.4 and then The Book and Back restore scroll 15710 on a page that has remounted with the line hidden. The 6.4 flag lands at y = 12, under the header. The same Back with the line closed lands the flag at y = 73. At 1280 the sentence is one line and Play ends at 737 either way. Change: `#ch6-real-half` stays in the stack from the first paint, empty until the latch fills it, and it keeps that height after the point moves on. The 6.1 claim does not take the two-line phone min-height, because this sentence is one line. The half-turn sentence keeps its two lines on the phone. Play's bottom then stays about a line inside 844 and inside 800, Pause does not move when the sentence fills in, and Back from the book meets the flag under the header.

### What to keep

The first screen before the latch, both themes, both widths. The lede, `6.1 · 0 of 6`, the one gesture, the square, "The total has left 0.", and Play. On the laptop, Play after the latch as well, with the sentence on one line and the blank prompt still in view. The four colours on the marks. Play, Pause, Play. The half-turn sentence stays after the point moves on, and a full turn says the point is home.

The mountain. Each camp opens with its flag under the header, the title clear of the bar, the gesture, the picture, and Play. The count is on the flag. The summit, Go, and Stage complete sit under that camp's blanks, and the reason is on the disabled tick. The sheet and the cards follow. The next-camp sentence is only on 6.6, and it names Chapter 7.

The drawer. Chapters 1–7, Later on the chapters that are still cards, Chapter 6 marked, every row 44px, the page behind it held still. Chapter 7 landing with Later at y = 73.

Back inside the chapter. Go writes the camp hash and returns to the scroll you left. The Book, then Back, returns to that camp with the flag under the header when the half-turn line was closed.

The Book kicker and Back to the book, the words at the size they were, the hit at 44px. Walk Chapter 6 at 163×44. Section rows that wrap the title and keep the page on the right. 6.1's Next beside p. 163.

Wrapped choices, the whole sentence on the button, Check at 85×44, inputs at 44px. The flashcard's "1 of 2" and "Still this card." The type, the paper, the 6px button, the 10px card, the same on chapter 4 and chapter 5.

## Chapter 6, batch 6

Branch `cursor/chapter-6`, on top of `453e317` (the branch tip also had the batch 5 UX note). Headless Chrome, fresh storage. 390×844 and 1280×800, light and dark. No console errors. No failed assets. `scrollWidth` was 390 and 1265.

`#ch6-real-half` is in the stack from the first paint, empty, 26px, and that height does not change when the left side latches or when Play is pressed. The sentence is "The point is on the left side." It does not print \(2i\). On the phone the 6.1 claim is one line (26px, not the two-line box). Play ends at y = 789 in the 844 window and at y = 737 in the 800 window, at rest, while pausing, and after a full turn, both themes. The square stays 284px and 272px. From 6.4, The Book and Back return the flag to y = 73.

The 6.4 why and summit still name a simply connected domain (Theorem 6.9, page 194). One gesture sits above 6.2. 6.3 keeps the bridge and "Play subdivides the triangle." 6.5's why is "6.4 needs an antiderivative." 6.6's line above the square is the drag and the bound \(1/R\). The 6.2 worked line stops at the segment, then multiply by \(z'(t)\) and integrate in \(t\). The power \(-1\) stays on the 6.3 sheet. The pole label is gone. The deform gesture stays. For the exam stays.

Two or more flashes say "1 of 2" at the flag's size. The `h3` is the question, and the cite stays on the source tag. A single card has no count. Book section rows, Chapter 4 and Chapter 6, put the page on the first line of a wrapped title.

The positive real start is not home. A full turn after the parameter has passed \(\pi\) says the point is home. Outside the unit circle the claim is "Outside, the formula does not apply." Typing 0 there checks right, and moving inside clears that mark. Theorem 6.5 on the 6.3 sheet is the book's hypothesis: analytic in a simply connected domain, simple closed contour in that domain (page 183). A segment card splits Theorem 6.1, page 172 (parametrize) from Theorem 6.9, page 194 (evaluate at the ends).

Deferred: the shared practice engine is another loop, so this chapter still renders `data/practice/ch6.json` with the local card. Chapter 7 is that loop's page and stays a Later card here. Chapters 8–11 are outside this loop.
