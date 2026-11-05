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

## Chapter 3

Branch `cursor/chapter-3`. Batch 1. Headless Chrome on a local server: `#chapter-3`, `#chapter-3-3-3`, `#book`, `#chapter-4`, `#chapter-5`. Light and dark. 1280 and 390. No console errors. No sideways scroll. Idle after Pause schedules 0 frames.

The three pictures agree with the sentences. z² at 1+i stays 45° and 2√2 while the direction changes. conj mirrors, and the turn moves. A turned square stays a square with the marked corner leading. Stretch is a rectangle at angle 0 and a rhombus at 45°, and the sentence changes. Conjugate levels cross at a right angle except at the origin. Circles do that only on the diagonal. Play says Pause, a second press holds the angle, and reduced motion says Step and advances a quarter turn. A typed chain-rule step, a Cauchy-Riemann choice, a generated polynomial, and a flashcard all answer in place. Marking 3.1 writes `progress.test2` and leaves a Chapter 4 tick alone. The roadmap shows Chapter 3 open, with 3.1 done, and Walk Chapter 4 is still the next walk.

On a 390×844 phone the arrows are on the first screen, under the why. The claim and Play sit just below that screen. The picture is the next thumb, not a buried one. Dragging the green corner turns the square and keeps it a square. Stretch, dragged, is neither a right angle nor equal sides. A point near the origin snaps there, where both slopes vanish.

## Another batch

The shared practice engine, when it lands, should replace the local card. The page already reads `data/practice/ch3.json`. Still open: a phone layout that keeps Play beside the claim on the first screen, and the exam recipes that are not cards yet. Theorem 3.4's long proof is a statement and a flash. The step-by-step blank is Theorem 3.3.

## Chapter 3 batch 2

Branch `cursor/chapter-3`, after `838edd7`. The reviewer's `6db51c7` and the two taste notes stay. Headless Chrome, light and dark, 390×844 and 1280×800.

The opening point is still 1+i. A 12px drag moves the dot with the finger, miss 0px, and the imaginary part stays 1. A drag while the button says Pause stops the angle. Four hundred milliseconds later the angle is the same number and the button says Play. Idle after that schedules 0 frames.

The first screen is the square, the claim, and Play. At 390, Play ends at y=703 inside 844. At 1280, Play ends at y=776 inside 800. The same numbers in the dark. The why sits under Play. The duplicate "Play sweeps the direction" line is gone. The orange turn is a visible arc. Switching to conj leaves the claim box at 53px and Play at the same y.

A wrong chain-rule step prints the expected factor and leaves Next step visible. `u_x=0=v_y and u_y=-1=-v_x`, `-i+2z`, `5*(z^2-iz+9)^4`, and `C + x^3 - 3xy^2` match. Theorem 3.4 stays a flash: defined and continuous in a neighborhood, partials continuous at the point, Cauchy-Riemann at the point, then f' = u_x + i v_x. Exercise 11 is |z|² only at 0. Example 3.6 is the two paths, 1 and −1. Exercise 7(a) is −4i. Some generated polynomials fail Cauchy-Riemann or hold only on the real axis. Some harmonic seeds fail Laplace. A passing one asks for the integral and for C'(x). The stage flag opens the one memory list. Missed puts that card next.

The drawer, the way up, and Back are untouched. Reduced motion still says Step and moves a quarter turn.

## Next

Hand the cards to js/practice/ when that renderer lands. Nothing else on this page until then.

## test-prep-coach (ch3 batch 1)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `160ab62`. Phone 390×844 first, then 1280×800, light and dark. No product code changed. No console errors. No sideways scroll. The chapter page is 12469px tall. The first screen, at both sizes and in both themes, is the title, "Next is 3.1 Differentiable and Analytic Functions. 0 of 3 stages.", the why, and the top of the derivative picture. The §3.1 memory list starts at y=2996. The §3.2 deck has two buttons, Show and Next card.

### Theorem 3.4

Leave the long proof as the flash. On the phone, card 2 of 5 in §3.2 asks "What extra hypothesis makes the Cauchy-Riemann equations guarantee a derivative?" The back is the statement, cited Theorem 3.4, page 89. There is no proof-blank and no proof-mc for it. The only proof drill is Theorem 3.3, page 86, once as a four-step blank and once as four choices. That split is the one to keep for an exam in a few days.

The web edition's matching statement is Theorem 3.2.6. The proof splits Δu, calls the mean value theorem, and carries four epsilons through to the limit of Δw/Δz. That is a page and a half. The exercises after it ask where f is differentiable and what f' is. §3.1 Exercise 11 is |z|², differentiable only at 0. The counterexample the card already names, Example 3.6, page 88 (web Example 3.2.5), satisfies the equations at 0 and then gives two limits, 1 along the real axis and −1 along y=x. Those two questions are what a student misses after memorizing "Cauchy-Riemann means differentiable." A twelve-step blank of the epsilon argument spends the night those two questions need.

The back of the flash should still match the sentence you would write if the exam says "state Theorem 3.4." The book asks for f defined and continuous in a neighborhood, the four partials continuous at the point, and the equations at the point. The card says u, v, and the four partials are continuous near z_0. "Near" is a stronger claim about the partials than the theorem makes, and it is the word Example 3.6 turns on.

The section's own "prove this" exercise is the polar form, Exercise 10, which is Theorem 3.5. That is a three-part chain-rule derivation. It waits until the computational holes below are filled. So do the short proofs of Theorem 3.1 and Theorem 3.8.

### Verdict

ANOTHER BATCH

The five recipes, the Theorem 3.3 drill, the chain-rule blank, and the conjugate integration are enough to start. They are not enough to sit the chapter's own exercise list. The endless cards train the success case, and the sheet repeats itself under the drills.

### Ranked

1. **Add the two uses of Theorem 3.4, and correct the flash.** Evidence: the live deck's Theorem 3.4 back says the partials are continuous near z_0. Nothing on the page is |z|², and nothing makes you compare the two paths in Example 3.6. The generator's choice "hold only on the axes" is never the answer (see 2). Change: keep Theorem 3.4 as one flash, with the book's three hypotheses and f'(z_0) = u_x + i v_x. Add a next-step on §3.1 Exercise 11: the equations hold only at 0, and f'(0) = 0. Add a three-step card on Example 3.6: the partials at 0, the equations hold there, the two limits are 1 and −1.

2. **Make a generated card that can fail.** Evidence, four seeds each, on the preview. Cauchy-Riemann: u = x+2y−1, v = −2x+y; then u = x−y, v = x+y−2; then u = x+y, v = −x+y+2; then u = 2x+2y+1, v = −2x+2y. Clicking "fail at every point" was wrong every time, and the why cited Theorem 3.4. Harmonic: clicking "2" was wrong every time, on Re(−z²), Re(−2iz²), Re(2iz²), and Re(z²), and the why said Laplace holds. §3.2 Exercise 1(g) is the case the generator offers and never builds: the equations hold only on the real axis. §3.3 Exercise 2 asks whether any analytic f has imaginary part x³+y³. Change: some Cauchy-Riemann seeds hold only at a point or only on a line, and the derivative is claimed only there. Some harmonic seeds fail Laplace on the first step. A seed that passes asks for ∫ u_x dy and then for C'(x), the same three moves as Exercise 5(a).

3. **Accept the line the exam wants, and show it after a miss.** Evidence, typed on the preview. On §3.2 Exercise 1(a), step 2, `u_x=0=v_y and u_y=-1=-v_x` was marked wrong and `both hold` was marked right. The why on the miss already prints those partials. On the chain rule, `5(z^2-iz+9)^4` was accepted, `5*(z^2-iz+9)^4` was rejected, and `-i+2z` was rejected for an inside derivative that `2z - i` passed. The miss showed "n[f(z)]^{n-1}" and left Next step hidden, so the factor never appeared. On §3.3 Exercise 5(a), the book's conjugate with the constant first, `C + x^3 - 3xy^2`, was marked wrong. The why explains C'(x) = 3x² and does not print v. Change: a miss prints the expected step under the why. The checker accepts the same sum with the terms in either order, and it accepts the four partials in place of the words "both hold."

4. **Give L'Hôpital one limit.** Evidence: §3.1's memory ends with "The 0/0 rule, for functions analytic at the point, with g' not zero." The deck states Theorem 3.2. No card computes a limit. §3.1 Exercise 7 is six of them. Change: one next-step-blank for Exercise 7(a), page 83, lim_{z→i} (z⁴−1)/(z−i). Both are 0 at i, the quotient of the derivatives is 4z³, and the value is −4i.

5. **One memory list, one tap from the stage.** Evidence, the live §3.1 list, in order: the five recipes, then "Same limit along every path," then "Analytic means a whole disk of derivatives" (recipe 3 already said that), then "Entire means the disk is the whole plane" (same recipe), then the singular-point line, then the quotient line again, then "Differentiable implies continuous" again, then L'Hôpital. §3.2's fifth recipe is "both hold and the partials are continuous, f' = u_x + i v_x," and the flash line under it is "Cauchy-Riemann plus continuous partials implies differentiable." That list starts at y=2996 on a 390×844 screen whose first view ends in the why. Change: Memory is the five recipes plus the three lines that are not already a recipe (singular point, the 0/0 rule, Example 3.6). The stage flag links there.

6. **A missed card comes back next.** Evidence: each §3.2 card, after Show, offers Show (hidden) and Next card. Sixteen statements across the three stages, and a miss leaves the queue. Change: Missed puts that card next. Leave the intervals out. The cite already sits on the card; keep it there.

### What to keep

The five recipes per stage, especially §3.2's last two lines: if either equation fails there is no derivative, and if both hold with continuous partials then f' = u_x + i v_x. Theorem 3.3 as a blank and again as choices. The last choice set on the phone is u_y = −v_x against u_y = v_x, and the note says the sign is the usual miss. The chain-rule blank on (z² − iz + 9)⁵, which is §3.1 Exercise 1(a), page 83, once the checker accepts a reordered product. The Re z paths, horizontal 1 and vertical 0, with "differentiable only at 0" sitting there as the trap from |z|². The z + conjugate card: u and v are 2x and 0, against x and −y. The hand-written conjugate on u = y³ − 3x²y, whose steps match the book's solution v = x³ − 3xy² + C. The statement cards for analytic, entire, singular point, Theorem 3.1, Theorem 3.6, Theorem 3.7, and Laplace. Theorem 3.4 left as a statement.
## appllama (ch3 batch 1)

Branch `cursor/chapter-3`, commit `160ab62`. Used like a MAT 412 student on https://ch3-preview.complexanalysis.pages.dev/#chapter-3. That preview serves this commit: `js/book/chapter3.js` matches. Headless Chrome, light and dark, at 390×844 and at 1280×800. On the phone the finger was a touch. On the laptop it was the mouse. A press on the green dot with no move, a 2px nudge, a drag, a press off the dot, a press 18px out and a press 26px out. Play, a pause, a continue, and a drag while the button said Pause. The conj chip, then Play. Reduced motion through four steps, in the dark. The square's corner along its circle, Stretch, the level point into the origin, and Circles. The menu, The Book, Back, and `#chapter-3-3-3`. The same opening in the dark, at both widths. A second lap with the CPU slowed to 4×. No console errors. No sideways scroll (the phone's scrollWidth is 390, the laptop's is 1265).

## Verdict

ANOTHER BATCH. The clock holds. Play says Pause and the direction turns, a second press says Play and the angle is the same 500ms later, and the turn is a steady 60 frames a second, including at 4×. Reduced motion says Step, moves a quarter turn, and schedules nothing.

The finger does not hold the point the page opens on. A drag from 1+i pulls the dot off the finger onto a smaller disk. At both widths the first screen shows the arrows. The claim and Play start below the window. The turn those arrows are there to show is a few pixels. One batch, then stop. It is the finger and the first screen. The clock stays.

## The finger

At rest the base point is 1+i, the angle is 0, and the claim is "The turn stays 45° and the stretch stays 2√2, for every direction." A press on the green dot, held, leaves both numbers. A 2px nudge leaves them. A press in the middle of the square, then a drag, leaves them, and the page does not scroll.

A drag to the right does not keep the dot. The finger moved 12px. The dot moved 13px down and left, and finished 20px from the finger, at real part 0.90 and imaginary part 0.71. Ten more samples, still pulling right, leave the miss at 17, 24, 30, 37, 44, 51, 59, 66, 73, and 81px. The real part climbs toward 1.15 and the imaginary part falls. The claim becomes "The turn stays 19° and the stretch stays 2.3, for every direction." The dot is sliding on the circle of radius 1.15. The page opened at radius √2, outside that circle.

Once the point is inside that disk, the dot stays on the finger. During Pause the miss is 0.36px on six samples, the real part follows, and the angle keeps climbing. A press 18px from the center grabs the dot. A press 26px out does not. The target is a 44px circle around a mark the phone draws 6px across.

The square's green corner stays on the finger when the drag follows its circle. Eight samples, radius 35px, miss 0.1 to 0.5px, and the claim stays "Right angle, equal sides, and the marked corner still leads. A square." Stretch then says "Neither a right angle nor equal sides. Not a square." A straight drag leaves the circle, and the corner stays on it. That is the corner's path.

The level point stays on the finger, miss at most 0.5px, while the claim is "The two curves cross at a right angle." Near the origin it snaps, 4px off the finger, to real part 0 and imaginary part 0, and the claim becomes "Both slopes vanish, so there is no angle to read." Circles, at the opening point 1+0.45i, says "The two curves do not cross at a right angle."

A touch drag leaves the square unframed. The outline is none, and `:focus-visible` stays false. A mouse drag focuses the stage and the outline is none.

## The clock

Play moves the angle about 0.03 and the button says Pause. Over the next 1.5 seconds there were 91 frames, median 16.7ms, 95th percentile 16.7ms, none over 20ms. The claim stayed "The turn stays 13° and the stretch stays 2.3, for every direction." and Play stayed at the same y. Pause left the angle at 1.454832000000002. Five hundred milliseconds later it was the same number, the button said Play, and the page had scheduled 0 frames. The next press said Pause and continued from that angle.

With the CPU slowed to 4×, one second of Play was 61 frames, median 16.7ms, maximum 16.8ms, none over 20ms.

In the dark the same hold: the angle was 0.20996100000000079, and 400ms later it was that number, and the button said Play.

Reduced motion, in the dark, opens on Step. Four presses advance the angle by a quarter turn each, schedule 0 frames, and the button stays Step. It does not say Pause. On z² the claim stays the 45° sentence, which is the sentence that is true for every direction.

Conj is the sentence that moves. The claim becomes "The purple arrow is the mirror of the green one. This direction turns by 0°, and the turn moves when the direction moves." Play then runs the degree from 0° to −124° in 1.2 seconds, 73 wordings, the button says Pause, and the frame gap stays under 17ms. The claim box stays 105px and Play stays at one y for that whole sweep.

Switching to conj is the jump. On the phone the z² claim is 52.7px and Play is at y = 461.6. The conj claim is 105.4px and Play is at y = 514.3.

## The page

On the phone the square is 208px, from y = 645 to 853, in an 844px window. The why ends where the square starts. The claim starts at 922. Play starts at 1035 and is 44px tall. The line between the square and the claim says "Play sweeps the direction. Drag the green dot." The green arrow is 22px. The orange turn is 4px across. The z² chip is 42px wide and 44px tall. conj is 59 by 44.

On the laptop, at scroll 0, the square is 352px, from y = 495 to 847, in an 800px window. The claim starts at 889. Play starts at 975. The title is one line. The same why, the same square, the same button below the window. In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The axes stay blue, the hand stays green, and the image stays purple. The same positions.

The Book is a 70×17 link. Theme and the menu are 44. The menu is the eleven chapters, each row 44px, and it covers the page. This lens leaves the drawer.

Mark stage complete is 44px tall. Pressing it says Stage complete, the flag says "3.1 · stage complete", the status says "Next is 3.2 The Cauchy-Riemann Equations. 1 of 3 stages.", and `mv:progress.test2` is `{"3.1":true}`.

From a scroll of 700, The Book opens `#book` at scroll 0. Back returns to `#chapter-3` at scroll 0. The phone page is 12469px. `#chapter-3-3-3` opens Harmonic Functions at the top of the window, marked as the target.

## Cut

1. **The dot stays under the finger, including at 1+i.** A 12px drag from the opening point leaves the dot 20px from the finger, on the circle of radius 1.15. The page opened at radius √2. Inside the disk the miss is 0.36px, and a drag during Pause leaves the angle running. Open on a point the finger can hold, or let the finger hold 1+i, and keep the arrows inside the square.

2. **The first screen is the square, the claim, and Play.** At 390, Play starts at y = 1035. At 1280, Play starts at y = 975. The orange turn is 4px across on the phone and 6 by 15 on the laptop, and the green arrow is 22px. Drop the 13rem cap. Cut "Play sweeps the direction. Drag the green dot." Put the why under Play. Give the turn a size the column can show. Play stays on the first screen at 390×844 and at 1280×800, in both themes.

3. **One height for the claim.** On the phone, conj grows the claim from 52.7px to 105.4px and moves Play from 461.6 to 514.3. During the sweep the taller box holds still while the degree changes. Fit both sentences in one box so the button stays put when the chip changes.

4. **The way up is 44px.** The Book is 70×17. Theme and the menu are already 44, and so is Play.

5. **Back returns to the scroll the chapter had.** From 700px, Back opens `#chapter-3` at 0. The hash already stacks.

## Keep

The clock. Play, Pause, the hold, the continue, Step under reduced motion, and 60 frames a second with the CPU slowed. A paused picture schedules nothing. z² keeps one sentence for the whole turn, and the box stays 52.7px while a drag changes the degrees. The four teaching colours, in both themes. The square's corner on its circle. Stretch flips the sentence. The level point, the snap at the origin, and Circles saying the curves do not meet at a right angle. Two chips and one Play. A press off the dot changes nothing. A drag leaves the square unframed. The stage mark, and the deep link to 3.3.

## Add

Nothing. No slider, no scrubber, no spring, no second clock, no third chip.

## ux-veteran (ch3 batch 2)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `e684095`. The served `js/book/chapter3.js` matches that commit. Used like a student, touch first: 390×844 and 360×780, then 1280×800, light and dark. No product code changed. No console errors. No sideways scroll (`scrollWidth` equals the window at 360, 390, and 1280).

### Verdict

ANOTHER BATCH

On a 390×844 phone the first screen teaches the derivative: the square, the 45° sentence, z² and conj, Play, and the why. Camps 3.2 and 3.3 open in the right order, and marking 3.1 leaves 3.2's title and why on that same screen. The way around that picture is still broken. The stage flag leaves the chapter. Back forgets a 13,000px scroll. The way up is a 17px label, and the last camp ends in a blank screen. At 360×780 and at 1280×800 the why is cut. One batch, these fixes, then this lens rests. Same type, same paper, same cards.

### What the hand meets

**390×844, light and dark.** Same boxes. The header is 56px. THE BOOK is 69.5×17 at y=81. The title is two lines, y=103 to 165. The square is 324px, y=214 to 538. The claim is 52.7px, y=546 to 599: "The turn stays 45° and the stretch stays 2√2, for every direction." z² is 42.4×44 and conj is 59×44, both at y=607. Play is 70×44, y=659 to 703. WHY YOU'D CARE is at y=719. The why is 105px, y=742 to 848, so 4px of the box sits past the 844 edge and the last line is on the fold. "Three stages, from the derivative to a harmonic conjugate." starts at y=848. "Next is 3.1 Differentiable and Analytic Functions. 0 of 3 stages." starts at y=933. The stage title starts at y=1051. The flag "3.1" is 20×44.

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The axes stay blue, the short arrow green, the long arrow purple, the turn orange. Same positions.

A 12px drag from 1+i keeps the dot on the finger, miss 0, and the claim becomes 40° with stretch 3.09. A drag that starts 18px from the dot moves it. A drag that starts 26px out leaves 1+i. The drawn dot is 9.5px across, inside a 44px grab (22px radius). Play says Pause, a second press says Play, and the angle is the same number 400ms later. conj keeps the claim at 52.7px and Play at y=659. The sentence becomes "The purple arrow mirrors the green one. The turn is 0°, and it moves." The words "drag the green dot" are the square's aria-label. 3.2 and 3.3 print that kind of line on the page. 3.1 does not.

**360×780, light and dark.** Same boxes. Play ends at y=672, inside 780. The why is 132px, y=712 to 844, so 64px of it is below the window. The last words on screen are "Two directions that". The site name truncates: the box is 186px, the text is 196px, "One Point, Two Addre…". The square is 294px and the dot is 8.6px across.

**1280×800, light.** The sidebar is the chapter list and the menu button is hidden. The square is 416px, the cap `100dvh - 24rem`. Play ends at y=776. WHY YOU'D CARE runs y=792 to 812, so the label is cut by the 800 edge. The why sentence starts at y=816. The status starts at y=927. The stage title starts at y=1019. A 12px drag again leaves the dot on the finger, miss 0. The dark frame uses the same colours as the phone.

### The drawer

At 390 the menu is 12 rows, each 44px. Chapter 3 is the current row. The drawer covers the page, body overflow is hidden, and `#view` is inert. Escape closes it. The rows are The Book and chapters 1 through 11. Chapter 11 ends near y=617, so the whole list fits. Test 1, the indexes, and test prep are absent from this drawer. At 1280 the same list is the sidebar. Chapters 3, 4, 10, and 11 wrap to about 47px. The others stay 44.

### Back, and the way up

From scrollY 900, THE BOOK opens `#book` at 0. Browser Back returns `#chapter-3` at 0. Scroll restoration is manual, and the router scrolls to 0 on every hash change.

Two links point at `#book`. THE BOOK is 69.5×17, 12.5px type, letter-spacing 0.75px. "Back to the book" is 134×23. The gap from the last Mark stage complete button down to that link is 843px at 360, 907px at 390, and 844px at 1280. `.chapter-path` padding-bottom is `100dvh - var(--header-h)`: 724px, 788px, and 744px. The screen at the end of the chapter is empty paper, then the source line, then the 23px link.

### The climb

`#chapter-3-3-3` opens Harmonic Functions with the title at y=121, under the 56px header, and the card marked as the target. On that screen: the why, the picture, "Drag the green point. Orange is a level of u. Purple is the other family.", the right-angle sentence, Conjugates and Circles.

The 3.2 heading, scrolled to the top, is the same order: 3.2, the title, page 85, the why, the square, "Drag the green corner.", the square sentence, Turn and Stretch. Those two camps are the pattern.

3.1 puts the picture, the why, the lede, and the status ahead of its own name. "Differentiable and Analytic Functions" is the next screen. The first screen carries the chapter title and the why. It does not carry "3.1" or "0 of 3".

The summit sentence is already on the page when the button still says Mark stage complete: "A derivative exists only when every tiny step is the same turn and the same stretch." Pressing it renames the button to Stage complete, sets aria-pressed, paints a green left edge, and writes `mv:progress.test2` as `{"3.1":true}`. The flag at the top of the stage becomes "3.1 · stage complete". On the screen in front of the button, 3.2's title and why are 98px below it. The status line "Next is 3.2 The Cauchy-Riemann Equations. 1 of 3 stages." updates at the top of the chapter, off this screen.

The flag is the break. Its href is `#chapter-section-3-1-memory`. Tapping that 20×44 control loads a page titled "No such place" for that hash. The memory list is still on the chapter, under the label Memory. The route parser does not treat `chapter-section-…` as a chapter.

The book, with that tick stored, still says "Next is §4.1, Exercise 3. 0 of 8 exercises." The button is Walk Chapter 4, 163×44, on the first screen. Chapter 3's card starts at y=724 and is cut by the 844 edge. Its three rows are spans. Tapping the 3.1 row leaves the hash on `#book`. "Open Chapter 3" is a 26px text link at y=1008.

### Style

Same system as chapter 4, chapter 5, and addresses, measured at 390, light. The title is Iowan Old Style, 25.85px, weight 600, rgb(26, 34, 48). Body is 17px system-ui. The lede is 16.8px, rgb(81, 91, 108). A card is white, 1px rgb(216, 210, 196), radius 10px, padding 16px. The paper is rgb(246, 243, 236) in the light and rgb(13, 18, 28) in the dark. Play is the white 44px button chapter 5 uses, radius 6px. Shown text inputs are 44px (`min-height: 44px`). Choice buttons are 44px. Turn, Stretch, Conjugates, and Circles are at least 44px in both directions. The four teaching colours are the arrows. This chapter already sits in the site's style.

### Ranked

1. **The stage flag stays on the chapter, and it is 44px wide.** Evidence: the 3.1 flag is 20.1×44, and the same width at 360 and 1280. Its href is `#chapter-section-3-1-memory`. The page that loads is titled "No such place". Change: point the flag at a hash the chapter route already opens, `#chapter-3-3-1` (and `-3-2`, `-3-3`), and scroll the memory list up under the header. Min-width 44px and min-height 44px. Leave the hash on the chapter.

2. **Back returns to the scroll the chapter had.** Evidence: from scrollY 900, THE BOOK opens `#book` at 0, and history.back opens `#chapter-3` at 0. The chapter is 13,595px at 390. Change: the router stores the scroll for each hash and restores it. A deep link such as `#chapter-3-3-3` still brings that stage's title under the header, where it already lands at y=121.

3. **One up control, 44px, with the source line directly under the last camp.** Evidence: THE BOOK is 69.5×17. "Back to the book" is 134×23. The gap under the last stage button is 843px at 360, 907px at 390, and 844px at 1280. Change: one `.station-link`, min-height 44, label "The Book", at the top of the chapter. The end of the page is the source line and that same control. Cut `.chapter-path`'s `padding-bottom: calc(100dvh - var(--header-h))`.

4. **The why finishes on the first screen at 360×780 and at 1280×800, and that screen names the stage.** Evidence: at 360 the why runs y=712 to 844 in a 780 window, and the visible sentence stops at "Two directions that". At 1280 the why sentence starts at y=816. The status starts below the fold at every size (y=929, y=933, y=927) and the stage title is lower (y=1046, y=1051, y=1019). The drag instruction is an aria-label; the dot is 9.5px at 390 and 8.6px at 360. Change: one line under the chapter title, in the part-label type the menu already uses, "3.1 · Differentiable and Analytic Functions · 0 of 3". One line under the square, the same book-page type 3.2 already uses: "Drag the green dot." Cap the 3.1 square so that line, Play, and the last line of the why end inside 780 and inside 800. At 360 the square is 294px and the why needs about 64px back. At 1280 the square is 416px and the why needs about 70px back. Give z² `min-width: 44px`; it is 42.4×44, and every other chip on the chapter is already at least 44 wide. Leave 3.2 and 3.3 in the order they have: name, why, picture.

5. **The book's button walks this mountain.** Evidence: with `{"3.1":true}` stored, `#book` still says "Next is §4.1, Exercise 3. 0 of 8 exercises." and the button is Walk Chapter 4. Chapter 3 starts at y=724. The 3.1 row is a span, and a tap leaves `#book`. "Open Chapter 3" is 26px tall at y=1008. Change: until 3 of 3 stages are marked, the button says Open Chapter 3 and the status counts those stages. Each of 3.1, 3.2, and 3.3 is a link, min-height 44, to `#chapter-3-3-1`, `#chapter-3-3-2`, and `#chapter-3-3-3`.

6. **The phone list stops at chapter 7.** Evidence: the open drawer is The Book plus chapters 1–11, each row 44px, chapter 3 current. Chapter 8 starts at y=441. A later chapter opens the roadmap on a Later card. Change: this drawer lists chapters 1–7. Chapters 8–11 stay in the data and off this list. The 44px rows, the current-chapter mark, the cover, and Escape stay.

### Keep

The type, the paper, the white cards, and the four teaching colours, in both themes. Play, Pause, and the hold. conj keeps the claim at 52.7px and Play at one y. The dot stays under the finger from 1+i, and a drag that starts 26px out changes nothing. 3.2 and 3.3 open with the name, the why, the picture, and a drag sentence. Mark stage complete, the green edge, and 3.2's title and why 98px under that button. `#chapter-3-3-3` puts the stage title under the header. Drawer rows are 44px, the open drawer covers the page, and the page behind it does not scroll. Shown inputs and choice buttons are 44px tall. No sideways scroll.


## skeptical-student (ch3 batch 2)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `e684095`. Phone 390×844 first, then 1280×800, light and dark. I have not read Chapter 3. No console errors. No sideways scroll (the phone's scrollWidth is 390, the laptop's is 1280).

I opened the chapter and the first screen was the title, two arrows, "The turn stays 45° and the stretch stays 2√2, for every direction," the chips z² and conj, and Play. On the phone Play ends at y=703, inside 844, and the why is on that same screen: a derivative is one number that turns and stretches every tiny step the same way. Two directions that disagree means there is no derivative. I pressed Play. It said Pause, the sentence stayed, and Pause put the button back. That much I could do.

The arrows themselves are unnamed. Green, purple, and the orange arc are never labeled on the page. The sentence that would have told me, "Play sweeps the direction. Drag the green dot to move the base point," is the picture's accessible name. It is not text. I dragged the dot. The claim became "The turn stays 27° and the stretch stays 4.3, for every direction," and the purple arrow left the top-right of the frame. The sentence still said the turn stays the same for every direction, while the number I was looking at had changed. I had moved the point, and the page never said so.

conj I did understand. From a fresh point the claim was "The purple arrow mirrors the green one. The turn is 0°, and it moves." Play ran that to −65° and the button said Pause. The angle between the arrows was big enough to see. z²'s 45° arc is a small hook in a large empty plot.

At 1280×800, light and dark, Play ends at y=776, inside 800. The why starts at y=816, so the laptop's first screen is the arrows, the claim, and Play, with the word "WHY YOU'D CARE" cut off on the bottom edge. Dark is the same layout: page rgb(13, 18, 28), text rgb(233, 237, 245), blue axes, green step, purple image. The phone in the dark matches the phone in the light, Play still ending at 703.

### The three pictures

The opening picture teaches the sentence under it once I press Play on z², and it teaches the failure once I press Play on conj. It does not teach analytic, and it does not teach the Cauchy-Riemann equations. Those words are not on the picture.

§3.2 does better. The why says the equations test whether the horizontal derivative and the vertical derivative are the same number. Under that, a green square has a purple image that is a turned square, and the line is "Drag the green corner. Green is the tiny square. Purple is its image." Dragging the green corner turned both, and the claim stayed "Right angle, equal sides, and the marked corner still leads. A square." The same drag in the dark. Stretch made a tall rectangle and said "A right angle, and the sides are not equal. Not a square." I could see that. I still could not see a partial derivative. Example 3.4, under the picture, is where u_x and v_y show up.

§3.3 I could read off the picture. Orange and purple levels cross, and the claim says they cross at a right angle. The origin says "Both slopes vanish, so there is no angle to read." Circles, from the opening point, says "The two curves do not cross at a right angle," and the circle sitting on the hyperbolas is the reason. Tapping Circles while I was still on the origin kept the vanish sentence, so the comparison the chip is for did not appear until I dragged away.

### Where I got lost

Under the why, one thumb down, a status says "Next is 3.1 Differentiable and Analytic Functions. 0 of 3 stages." Then a 20×44 link reading "3.1", then the section title, then "In the book": Equation (3.1), Definition 3.1, Definition 3.2, Theorem 3.1, Equations (3.4)–(3.10), Theorem 3.2. Six names and pages. No statement. Example 3.1 then ends "so f'(z) = 3z² everywhere and f is entire." I had not been told what entire means. That word is in the memory list, below the exercises.

The first time the page says "Cauchy-Riemann" is §3.1 Exercise 11, step 1: with u = x² + y² and v = 0, the equations hold only at 0, or everywhere, or nowhere, or on the real axis. I had not been given the equations. The section that states them is the next one. I could guess "hold only at 0" because the prompt already says "differentiable only at 0."

The labels 3.1, 3.2, and 3.3 are links, 20px wide and 44px tall. 3.1 points at `#chapter-section-3-1-memory`. I tapped it. The chapter was gone. The title was "No such place · One Point, Two Addresses," and the page said nothing lives at that hash. 3.2 and 3.3 point at the same kind of hash.

`#chapter-3-3-3` does open Harmonic Functions at the top of the phone, with the picture and the claim in view.

### Misses

A wrong answer explains the step and then hands me the line, and Next step is already there.

On the chain rule I typed `5(z^2-iz+9)^5`. The note said "The outside power n = 5 contributes n[f(z)]^{n-1}. The step is 5(z^2 - iz + 9)^4." The carets are literal characters. Check and Next step were both on the card. I could go on without ever typing the factor.

On Re z I tapped 0. The note said the real part changes by the whole step, so the quotient is 1, and "The step is 1." Next step was there. The 0 button was still live. Nothing said the tap was the wrong one. Tapping 1 afterwards locked the choices and dropped the words "The step is."

On the proof of Theorem 3.3 I typed "no idea." The note explained the horizontal path and ended "The step is u_x + i v_x," with Next step showing. The same on the four choices: I tapped `u_x - i v_x` and the note ended "The step is u_x + i v_x." On the generator, u = x and v = 0, I tapped "hold at every point." The note said u_x = 1 and v_y = 0, then "The step is fail at every point." On u = x³ + y³ I tapped 0. The note said the sum is 6x + 6y, then "The step is 6x + 6y."

A right answer is the useful version of the same note. `u_x + i*v_x` on the proof left "The denominator is x - x_0, so the quotient splits into the two partials in x," and hid Check. That is a miss that would have helped. The printed line on top of it means I never have to produce the step.

### What I typed

These counted: `5*(z^2-iz+9)^4`, `-i+2z`, `(2z-i)*5*(z^2-iz+9)^4`, `u_x + i*v_x`, `-i*u_y + v_y`, `x+4 and -y`, `-y and x + 4`, `u_x=0=v_y and u_y=-1=-v_x`, `both 0`, `4*z^3`, `-4i`, `C(x)-3xy^2`, `C + x^3 - 3xy^2`.

These did not. `(z^2-iz+9)^4*5` was wrong, and `5*(z^2-iz+9)^4` was right: the star in front of the 5 is deleted, so `^4*5` becomes the exponent 45. `u=-y and v=x+4` was wrong, which is the line the step "u and v are" asked me to write. `4(-i)` was wrong, and the note's own sentence is 4(−i) = −4i. `0, 0` was wrong and `both 0` was right. `x^3 - 3xy^2` without the constant was wrong, and the note does say why the constant is there. `2z+i` was wrong, and that one is a real sign error.

### Can I study from it

The pieces are on the page. Theorem 3.3 is a four-step blank and the same proof again as four choices, and the last choice set is the sign. The chain rule, the two paths for Re z, L'Hôpital down to −4i, and the conjugate built up to `C + x^3 - 3xy^2` are the exam moves. Another on the Cauchy-Riemann card reached a polynomial that fails everywhere and one that is the real-axis pattern (u = x² + y², v = 2xy). Another on the harmonic card reached "Is there a harmonic conjugate?" for x³ + y³. The memory list is one list per stage, and I could cram the five lines of §3.2 and of §3.3 the night before. The §3.1 list is longer, and it is where entire, singular point, and the 0/0 rule finally get a sentence.

The flash cards work as cards. Show on §3.2's first card, then Missed, and the front became "What extra hypothesis makes the Cauchy-Riemann equations guarantee a derivative?" while the count still said Card 1 of 5. Next card said Card 2 of 5 and brought the Cauchy-Riemann statement back. Theorem 3.4 stays that one statement. I can use the deck. I can also finish every proof blank by reading "The step is" and pressing Next step, so the blanks do not make me write the proof.

### Verdict

ANOTHER BATCH

I can tell what Play does, and §3.2 and §3.3 show me a square and a right angle with a sentence that matches the picture. I cannot use the 3.1 label, the opening picture never says that a drag moved the point, and a wrong proof step lets me skip. One batch for those. The cards and the pictures can rest after that.

### Ranked

1. **The stage label stays on the chapter.** Evidence: 3.1, 3.2, and 3.3 are 20×44 links. Tapping 3.1 set the hash to `#chapter-section-3-1-memory`, the title became "No such place," and the square was gone. Change: the label scrolls to that stage's memory list and leaves the address at `#chapter-3`. Make the target 44px wide.

2. **A miss makes me produce the line.** Evidence: `5(z^2-iz+9)^5` left Check and Next step both showing, and the note ended "The step is 5(z^2 - iz + 9)^4," carets and all. The same ending followed a wrong tap on Re z, on both copies of Theorem 3.3, on u = x with v = 0, and on x³ + y³. A right answer omits "The step is" and hides Check. Change: keep the reason, stop appending the expected line, hide Next step until the line is right, and mark the choice that was tapped. Render the reason as math where it is math.

3. **The first picture says which gesture does what.** Evidence: the only line that names Play and the drag is the picture's accessible name. A drag replaced 45° and 2√2 with 27° and 4.3, the sentence still said "for every direction," and the purple arrow left the frame. At 1280 the why starts at y=816. Change: one visible line under the plot. "Green is the step. Purple is where it goes. Orange is the turn. Play turns the step. Drag moves the point." When the point moves, name the point in the claim. Keep both arrows inside the frame. Put the why on the first screen at 1280×800, where the phone already has it.

4. **A word is stated before an exercise uses it.** Evidence: Example 3.1 ends "f is entire," and entire is defined in the memory list under the exercises. Exercise 11's first step is the first time the page says "Cauchy-Riemann," with four hold-or-fail choices, and the prompt has already said "only at 0." The statement of the equations is a flash card in §3.2. The "In the book" list above the example is six names and pages. Change: one sentence for analytic and one for entire before the worked example. Make Exercise 11 a two-path question, as Re z already is, and let §3.2 be the first question that asks for the equations.

5. **The line I would write on the exam counts.** Evidence, typed on the phone: `(z^2-iz+9)^4*5` was marked wrong and `5*(z^2-iz+9)^4` was marked right, because deleting the star glues the 5 onto the exponent. `u=-y and v=x+4` was wrong and `x+4 and -y` was right. `4(-i)` was wrong while the note writes 4(−i) = −4i. Change: a star between an exponent and the next factor stays a factor. Accept u and v with their labels. Accept `4(-i)` as `-4i`.

6. **Circles, after the origin, shows the curves that fail.** Evidence: the origin says "Both slopes vanish, so there is no angle to read." Tapping Circles there kept that sentence. From the opening point, Circles says "The two curves do not cross at a right angle," and the circle against the hyperbolas is on the screen. Change: choosing Circles from the origin puts the point back where the two families can be compared.

### Keep

The three why sentences, and the three summit sentences under the cards. Play and Pause. z² holds one sentence while the direction turns. conj's sentence moves, from 0° to −65° on the phone, with Pause showing. The square that stays a square while the green corner turns, in the light and in the dark, and Stretch's rectangle with the sentence that the sides are not equal. The conjugate levels crossing at a right angle, and the origin saying both slopes vanish. Circles from the opening point. Example 3.1's difference quotient, in rendered math. Theorem 3.3 as a blank and again as four choices, and a right step's note that explains the path and leaves the line I typed. The chain rule, the two paths for Re z, L'Hôpital through −4i, and the conjugate that accepts `C + x^3 - 3xy^2`. One memory list per stage. The flash cards, Missed putting that card next, and Theorem 3.4 left as a statement. Another, including u = x with v = 0 and u = x³ + y³. The deep link `#chapter-3-3-3`. Dark at both widths, with the same layout. Choice buttons at 44px.

## Chapter 3 batch 3

Branch `cursor/chapter-3`, on top of `402039a`. Headless Chrome, light and dark, at 390×844, 360×780, and 1280×800.

The stage flag is 44×44. It points at `#chapter-3-3-1` (and `-3-2`, `-3-3`) and scrolls that stage's memory list to about y=72, under the header. The address stays on the chapter. `#chapter-section-3-1-memory` is gone, so it no longer opens "No such place".

The first screen names the gesture: "Drag the green dot. Green is the step. Purple is where it goes. Orange is the turn." At 1+i the claim is still "The turn stays 45° and the stretch stays 2√2, for every direction." After a drag it names the point and drops that phrase (measured: "At 1.76 + 1.24i, the turn is 35° and the stretch is 4.3."). The purple arrow stays inside the square. "3.1 · Differentiable and Analytic Functions · 0 of 3" sits under the title. The why finishes inside the window: bottom y=759 at 390×844, y=771 at 360×780, y=783 at 1280×800. The opening square is 156px, 141px, and 304px at those three sizes. z² is 44×44.

A miss keeps the reason and does not print "The step is". Next step stays hidden until the line is right. A wrong choice is marked and stays tappable. `-(i-2z)` matches `2z - i`. `-(i+2z)`, `i-2z`, and `-(2z-i)` do not.

The way up is one 44px "The Book" station link. "Back to the book" is gone. The chapter path no longer pads by a viewport, so the source line follows the last stage instead of a blank screen. `#chapter-3-3-3` still puts the title at y=121. Back from the book restores the chapter's scroll.

While Chapter 3 is unfinished, `#book` opens on "Open Chapter 3" (44px, top of the phone) and the status counts those stages. The three rows are 44px links to `#chapter-3-3-1`, `-3-2`, and `-3-3`. The book nav lists chapters 1–7.

Analytic and entire are two sentences before Example 3.1. The Cauchy-Riemann equations are stated before Exercise 11, and that card is now the two paths for `|z|^2` (horizontal `2x_0`, vertical `-2iy_0`, agree only at 0). Section 3.2 states the equations again in the why. Circles tapped at the origin moves the point back to `1+0.45i` and says the curves do not cross at a right angle. The Cauchy-Riemann generator's seed mod 6 includes a family that holds only at 0, the `|z|^2` pattern, so that choice is sometimes the right one.

`node tools/check_vectors.mjs` (234/234), `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` passed.

## Still open

The shared practice renderer is not on this branch, so the chapter still uses its local card. Theorem 3.4 is a statement and a flash, not a fill-in proof. The opening square is small on a phone so the why can finish; the arrows are the same picture, drawn smaller. The book button and the chapter list live in shared files, so the hand-merge with Chapter 2's "Open Chapter 2" still has to put both buttons on `#book`.

## appllama (chapter-3 batch 3)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `e18c094`. The served `js/book/ch3-pictures.js`, `js/book/chapter3.js`, `css/components.css`, and `js/app.js` match that commit. Phone 390×844 first, touch, light then dark, then 1280×800, mouse, light then dark. A press with no move, a 2px nudge, a 48px drag, a press 18px out and a press 26px out. Play, a pause, a continue, a second tap while Pause was showing, and a drag while the button said Pause. conj, then Play. Reduced motion through four steps, in the dark. The square's green corner along its circle, Stretch, the level point, the origin, and Circles. The menu, The Book, Back from scrollY 900, the 3.1 flag, and `#chapter-3-3-3`. The same opening in the dark, at both widths. A second lap with the CPU slowed to 4×. No console errors. No sideways scroll (the phone's scrollWidth is 390, the laptop's is 1280).

## Verdict

ANOTHER BATCH. The clock holds, and so do the two pictures under it. The opening picture does not. On the phone it is a 156px stamp in a 324px card, so the turn is a 7×17 hook and the handle is 4.5px across. A straight drag then peels that dot off the finger while the finger is still inside the square. One batch. The clock, the claim box, and §3.2 and §3.3 stay as they are.

## The finger

At rest the base point is 1+i, the angle is 0, and the claim is "The turn stays 45° and the stretch stays 2√2, for every direction." A press on the green dot, held, leaves both numbers. A 2px nudge leaves them. The same in the dark, and the same at 1280.

A rightward drag stays on the finger, then leaves it. On the phone the miss along that drag is 0, 0, 0, 0, 0.7, 6, 11.5, and 17px. The peel starts while the finger is still 15px inside the square (finger x = 257, the square ends at 273). The dot has slid down off the horizontal: the point finishes at 1.99 + 0.8i, and the claim is "At 1.99 + 0.8i, the turn is 22° and the stretch is 4.3." The same eight misses in the dark. At 1280 the same 48px stays at miss 0 and the point is 1.76 + i, because each pixel is fewer units. The next drag, starting 18px to the right of the dot, is the peel on the laptop too: the point arrives at 1.98 + 0.84i. A press 26px out changes nothing, at both widths. The hit is a 44px circle. The drawn dot inside it is 4.5px on the phone and 8.9px on the laptop.

The peel is the disk. The plane clamps to a circle of radius 2.15, and 1+i is already at radius √2, so a horizontal move dies at real part about 1.90 and the dot rides the circle away from the finger. The corners of the square are past that circle, so they are drawn and cannot be held.

The square's green corner stays on the finger when the drag follows its circle. Six samples, radius 55px, miss 0, and the claim stays "Right angle, equal sides, and the marked corner still leads. A square." The corner is 9.4px across on a 324px square. Stretch then says "A right angle, and the sides are not equal. Not a square."

The level point stays on the finger, miss 0 on six samples, claim "The two curves cross at a right angle." At the origin the claim is "Both slopes vanish, so there is no angle to read." Circles from there puts the point back at 1 + 0.45i and says the curves do not cross at a right angle.

A touch drag leaves the square unframed. The outline is none, and `:focus-visible` stays false.

## The clock

Play moves the angle and the button says Pause. Over the next 1.5 seconds there were 90 frames, median 16.7ms, maximum 16.8ms, none over 20ms. Pause left the angle at 1.4248836000000018. Five hundred milliseconds later it was the same number, the button said Play, and no further frame had been requested. The next press said Pause and continued from that angle. A second tap in the same breath returns the button to Play and leaves it there.

With the CPU slowed to 4×, one second of Play on z² was 63 frames, median 16.7ms, maximum 16.8ms, and the angle advanced 0.90, which is the clock's own speed. conj, same lap, was 61 frames, median 16.7ms, none over 20. The claim moved from 0° to 152° and the box stayed 52.7px.

In the dark the same hold: the angle was 1.424941200000002, and 500ms later it was that number, and the button said Play.

Reduced motion, in the dark, opens on Step. Four presses advance the angle by a quarter turn each (π/2, π, −π/2, 0), request nothing, and the button stays Step. On z² the claim stays the 45° sentence. conj at that opening says "The purple arrow mirrors the green one. The turn is 0°, and it moves." The claim is 52.7px and Step is at y = 570.5.

A drag that starts while the button says Pause returns the button to Play. Switching to conj leaves the claim at 52.7px and Play at the same y, on the phone (570.5) and on the laptop (647.4), in both themes. During conj's sweep the degree changes and the box does not.

The level drag is the frame that slips. The same 4× lap that held Play at 16.7ms rebuilt the level picture at median 33.3ms, maximum 50ms, every gap over 32ms. Each move replaces the whole grid. On the laptop, unthrottled, that same drag stays at 16.7ms.

## The page

On the phone the opening square is 155.5px, from y = 259 to 415, centered at x = 117 in a 324px card. §3.2 and §3.3 on that same phone are 324px squares. The orange turn is 6.8×16.5. The green arrow is 18px and the purple arrow is 36px. The handle is 4.5px. The gesture line, the 45° sentence, z² (44×44), conj (59×44), and Play (70×44, y = 570 to 614) sit under it. The why ends at y = 759, inside 844. The lede ends at 811. The status line starts at 844.

On the laptop the opening square is 304px, from y = 240 to 544. The turn is 13.4×32.2, the green arrow is 36px, the purple arrow is 71px, and the handle is 8.9px. Play ends at y = 691. The why ends at y = 783, inside 800. The same boxes in the dark. The page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The axes stay blue, the hand stays green, the turn stays orange, and the image stays purple. Theme swaps those surfaces without moving Play or the square.

The Book is 109×44. From scrollY 900 it opens `#book` at 0. Back returns `#chapter-3` at 900. The 3.1 flag is 44×44. It opens `#chapter-3-3-1` and puts the memory list at y = 72. `#chapter-3-3-3` puts Harmonic Functions at y = 121. The chapter path's bottom padding is 0. The source line sits 49px under the last stage button. The drawer is The Book and chapters 1 through 7, each row 44px, the page behind it does not scroll, and Escape closes it.

## Cut

1. **The opening square uses the column, on the phone.** Evidence: at 390 the stage is 155.5×155.5, centered, with 101px of card on either side. The orange turn is 6.8×16.5 and the handle is 4.5px. §3.2 and §3.3 are 324px on that screen, and the corner there is 9.4px. Play already ends at y = 614, so the stamp is what bought the why, which ends at y = 759. At 1280 the stage is 304px, the turn is 13.4×32.2, and the why still ends at y = 783 inside 800. Change: drop the 48% cap on the 3.1 stage for the phone column, and let that square be the 324px width §3.2 already uses. Keep the 1280 cap that holds the why inside 800. Play stays on the first screen. The why goes under Play on the phone. No new control.

2. **The dot stays under the finger until the finger leaves the square.** Evidence: the phone's rightward drag is on the finger for 24px and then misses by 0.7, 6, 11.5, and 17px, the last of those while the finger is at the square's right edge. The point has left the horizontal, 1+i to 1.99+0.8i. At 1280 a longer drag does the same, 1+i to 1.98+0.84i. The clamp is a disk of radius 2.15, and the corners of the drawn square sit outside it. Change: clamp to the rectangle the axes already draw, so a straight drag keeps the dot on the finger for every point inside the frame. Past the frame, the drag ends. No spring.

3. **The level drag keeps the frame Play already keeps.** Evidence: at 4×, Play on z² and on conj stays at median 16.7ms with nothing over 20ms. The level drag in that same lap is median 33.3ms, maximum 50ms, every gap over 32ms. Each move rebuilds every curve. Unthrottled, on the laptop, the same drag is 16.7ms and the miss is 0. Change: draw the faint families when the chip changes, and on a move update the point and the two live curves. One frame, the same clock.

## Keep

The clock. Play, Pause, the hold, the continue, Step under reduced motion, and 60 frames a second with the CPU slowed. A paused picture requests nothing. z² keeps one sentence for the whole turn. conj keeps the claim at 52.7px and Play at one y while the degree changes, at both widths and in both themes. The four teaching colours, in both themes, and a theme change that does not move the square. The square's corner on its circle, miss 0, and Stretch flipping the sentence. The level point on the finger, the snap at the origin, and Circles returning from the origin to 1+0.45i. Two chips and one Play. A press off the dot changes nothing. A 2px nudge changes nothing. A drag leaves the square unframed. The Book at 44px, Back restoring scrollY 900, the 44px flag, the memory list under the header, and `#chapter-3-3-3` at y = 121. The drawer, chapters 1–7, and Escape. No sideways scroll.

## Add

Nothing. No slider, no scrubber, no spring, no second clock, no third chip.

## test-prep-coach (chapter-3 batch 3)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `e18c094`. The served `js/book/chapter3.js`, `js/book/ch3-cards.js`, `js/book/ch3-grade.js`, `data/practice/ch3.json`, and both generators match that commit. Phone 390×844 first, then 1280×800, light and dark. No product code changed. No console errors. No sideways scroll (`scrollWidth` is 390 and 1280). The chapter is 13059px on the phone and 10837px on the laptop. In the dark the phone is rgb(13, 18, 28) with text rgb(233, 237, 245). At 1280 in the light the paper is rgb(246, 243, 236) with text rgb(26, 34, 48), and the dark frame uses the phone's colours. The why ends at y=759 on the phone and y=783 at 1280, in both themes.

§3.1 Memory starts at y=3858 on the phone and y=3234 at 1280. The 3.1 flag is 44×44, its href is `#chapter-3-3-1`, and the list lands at y=72 under the header.

### What the night before can use

Eight lines on §3.1, five on §3.2, five on §3.3. The decks are 7, 5, and 4 cards. Theorem 3.4's back is the three hypotheses the exam asks you to state: f defined and continuous in a neighborhood of z_0, the four partials continuous at z_0, the Cauchy-Riemann equations at z_0, then f'(z_0) = u_x + i v_x. Cited Theorem 3.4, page 89, which is web Theorem 3.2.6. Missed on the §3.2 deck put that card on the front, left the count at Card 1 of 5, and hid the back. Next card brought the Cauchy-Riemann statement back as Card 2 of 5. Show and Next card are 141×44 once the back is open.

Typed on the phone, and accepted: `(z^2-iz+9)^4*5`, `-(i-2z)`, `(2z-i)*5*(z^2-iz+9)^4`, `u=-y and v=x+4`, the two partial checks with the equations swapped, `i`, `C(x) - 3xy^2`, `C + x^3 - 3xy^2`, `both 0`, `4*z^3`, `4(-i)`, and `u_x + i*v_x`. A wrong proof step, "no idea", kept Next step hidden and the note stayed on the horizontal path. A wrong tap on Re z, the choice 0, stayed enabled, and the note said the quotient is 1.

The Cauchy-Riemann generator, eight cards from the opening seed: two that hold everywhere, then u = x² + y² with v = 2xy, then u = x with v = 0, then u = x² + y² with v = 0, then three more that hold everywhere. Tapping "hold only on the real axis" on the third card was right. The note named §3.2 Exercise 1(g). Next step offered "2x, only on the real axis", "2z everywhere", "does not exist anywhere", and "0". The harmonic generator reached u = x³ + y³ on the fourth card and u = x² + y² on the eighth, each as "Is there a harmonic conjugate?"

### What the chapter's exercises still ask

§3.1 Exercise 1, page 83, is three derivatives. The blank is 1(a), the fifth power. 1(b) is h(z) = (2z+1)/(z+2). That quotient is absent from the prompts. The fourth memory line says polynomials, products, and quotients differentiate as in calculus, and a quotient fails where the denominator is 0. The rules card names the quotient rule. The formula is on neither.

§3.1 Exercise 3 is the analytic question. f and g are entire. Which of [f(z)]³, f(z)g(z), f(z)/g(z), f(1/z), f(z−1), and f(g(z)) must be entire? The deck defines analytic, entire, and singular point. No prompt asks.

§3.2 Exercise 1(a) is the iz + 4i blank, and it finishes at f' = i. Eight generated prompts are polynomials in x and y. Exercise 1(b), page 93, is (y + ix)/(x² + y²), which is i/z for z ≠ 0, with derivative −i/z². Exercise 3 on that page asks for the constants a and b so that (2x − y) + i(ax + by) is differentiable for every z. The book's solution is a = 1 and b = 2. The page has no a and no b.

§3.3 Exercise 5(a), page 100, is the conjugate blank. The book's solution is v(x, y) = x³ − 3xy² + c. Typed `v = x^3 - 3xy^2 + C` was marked wrong, and Next step stayed hidden. `C + x^3 - 3xy^2` was marked right. Exercise 2 on that page asks whether any analytic f has imaginary part x³ + y³. The polynomial shows up as a real part, on the fourth generated card. The memory line builds v by integrating u_x. Exercise 5(c) hands you v = e^y sin x.

Example 3.6, tapping "hold", printed "u_x = v_y = 1 and u_y = v_x = 0 at the origin." The values match the book, page 88 (web Example 3.2.5): u_x(0,0) = v_y(0,0) = 1 and u_y(0,0) = v_x(0,0) = 0. The written equation u_y = v_x is the sign the proof card's last choice is there to catch. The check is u_y = 0 = −v_x.

On L'Hôpital's first step, `0, 0` was marked wrong and `both 0` was marked right. On the last step, the wrong value `4i` printed "4i³ = 4(−i) = −4i".

### Verdict

ANOTHER BATCH

The sheet, the Theorem 3.4 card, the two-path cards, the proof of Theorem 3.3, the polynomial generator, and the conjugate of a given u will carry the first half of a Chapter 3 exam. Exercise 1(b), Exercise 3, the rational Cauchy-Riemann question, the constants a and b, and Exercise 2 in the book's wording are still open. One batch for those five, plus the line the book prints for the conjugate. Theorem 3.4 stays a statement. Theorem 3.5 stays a flash.

### Ranked

1. **Write the quotient, and drill §3.1 Exercise 1(b).** Evidence: the fourth §3.1 memory line says a quotient fails where the denominator is 0, and the rules card names the rule. The derivative blank is (z² − iz + 9)⁵, Exercise 1(a), page 83. Exercise 1(b), h(z) = (2z+1)/(z+2), is absent from the prompts. Change: put the quotient formula (g f' − f g')/g² on that memory line, beside the chain factor n[inside]^{n−1} times the inside derivative. Add one next-step-blank: the numerator is 3, h'(z) = 3/(z+2)², and z = −2 is the singular point.

2. **One card for §3.1 Exercise 3.** Evidence: the §3.1 deck states analytic, entire, and singular point, and no item asks which expressions stay entire. Change: one next-step-mc. f and g are entire. [f]³, fg, f(z−1), and f(g(z)) must be entire. f/g need not be, because g may vanish, and f(1/z) need not be. The distractors swap those two with a composition that does stay entire.

3. **One Cauchy-Riemann card outside the polynomials.** Evidence: the fixed blank is iz + 4i, and f' = i everywhere. Eight generated prompts, the opening seed through seven Anothers, are polynomials. §3.2 Exercise 1(b), page 93, is (y + ix)/(x² + y²) = i/z for z ≠ 0, with f' = −i/z², and the function is not analytic at 0. Change: one next-step on that function. The misses worth offering are "entire", "differentiable only at 0", and f' = i/z².

4. **Pin §3.3 Exercise 2 as the imaginary part, and say what to do when the exam gives v.** Evidence: the fixed harmonic card is u = y³ − 3x²y, Exercise 5(a). u = x³ + y³ appears on the fourth generated card, after three Anothers, under "Is there a harmonic conjugate?", as the real part. Exercise 2, page 100, asks whether any analytic f has imaginary part x³ + y³. The memory line integrates u_x to build v. Exercise 5(c) gives v = e^y sin x. Change: a fixed two-step card in the book's words. The Laplacian is 6x + 6y, so no such f exists. Add one memory line: if the exam gives v, integrate −v_x in y, then fix C(x) from u_x = v_y.

5. **Find the constants in §3.2 Exercise 3.** Evidence: the page never asks for a or b. The book's solution is a = 1 and b = 2 for f = (2x − y) + i(ax + by), page 93. The generator checks a finished pair of polynomials. Change: two blanks. u_x = 2 = v_y forces b = 2. u_y = −1 = −v_x forces a = 1. Offer the swapped pair, and a sign change, as the misses.

6. **Take the line the book prints, and write the Example 3.6 check with the minus.** Evidence, typed on the phone: `v = x^3 - 3xy^2 + C` was marked wrong and Next step stayed hidden. `C + x^3 - 3xy^2` was marked right. The solution of Exercise 5(a) is v(x, y) = x³ − 3xy² + c. `0, 0` was marked wrong on the L'Hôpital opening, and `both 0` was marked right. Tapping "hold" on Example 3.6 printed "u_y = v_x = 0". The wrong last step on Exercise 7(a) printed "4i³ = 4(−i) = −4i". Change: accept a leading `v =`, and accept `0, 0` as the two zeros. The Example 3.6 note reads u_x = 1 = v_y and u_y = 0 = −v_x. A miss on the value stops before −4i. The right answer can show it.

### What to keep

The eight, five, and five memory lines, and the 44px flag that puts the §3.1 list at y=72. State Theorem 3.4 from the card. The fifth §3.2 recipe stays the computing rule: both equations, continuous partials, f' = u_x + i v_x. Missed, which puts the missed card next and leaves the intervals out. Theorem 3.3 as a blank and again as four choices, with u_y = −v_x against u_y = v_x. The chain-rule blank, factors in either order, including a star between the exponent and the next factor, and `-(i-2z)` for `2z - i`. The two paths for Re z, with "differentiable only at 0" as the |z|² trap, and the two paths for |z|²: horizontal 2x_0, vertical −2iy_0, agree only at 0, and f'(0) = 0. L'Hôpital through 4z³ and `4(-i)`. iz + 4i, partials in either order, f' = i. z + conjugate, with u and v equal to 2x and 0, failing at every point. The generator's four outcomes, Exercise 1(g) as a right answer, and "2z everywhere" beside "2x, only on the real axis". The conjugate built from u_x, with C(x) written first. The harmonic failure cards, once Another has been pressed, as extra drill beside the pinned Exercise 2. The statement cards for analytic, entire, singular point, the differentiation rules, Theorem 3.1, Theorem 3.2, Theorem 3.5, Theorem 3.6, Theorem 3.7, Laplace, the conjugate definition, Theorem 3.8, and Theorem 3.9. Theorem 3.5 remains a flash. The polar proof and the constant-modulus proof can wait until the five exercise holes above are cards.

## ux-veteran (chapter-3 batch 4)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `63cbc5e`. The served `js/book/chapter3.js`, `js/book/ch3-pictures.js`, `js/book/ch3-cards.js`, `css/components.css`, `js/app.js`, and `js/data/book-path.js` match that commit. Used like a student, touch first: 390×844 light then dark, then 1280×800 light then dark. No product code changed. No console errors. No sideways scroll (`scrollWidth` is 390 and 1280). The chapter is 15839px on the phone and 12802px on the laptop.

### Verdict

ANOTHER BATCH

On a fresh phone the first screen is the climb: the square fills the column, the 45° sentence, the gesture, and Play, with 3.1 named under the title. Back returns the scroll. The camps open in order, and marking 3.1 leaves 3.2's title and why on that screen. Two labels still point the wrong way. After 3.1 is marked, a reload puts "3.2 · The Cauchy-Riemann Equations" over the derivative picture. The book, at 0 of 3, puts Walk Chapter 4 on the same first screen as Open Chapter 3, and it still says eleven chapters. One batch for those, and for the laptop line that the 800px window slices. The square, the 44px controls, and Back stay.

### The first screen

**390×844, light and dark.** Same boxes. The header is 56px. The Book is 108.7×44 at y=80. The title is two lines, y=132 to 194, Iowan Old Style 25.85px weight 600. The stage line is one line, y=202 to 218, 12.48px, and it fits (the text is 358px and the box is 358px): "3.1 · Differentiable and Analytic Functions · 0 of 3". The square is 324×324, y=259 to 583. The gesture is three lines, y=591 to 670: "Drag the green dot. Green is the step. Purple is where it goes. Orange is the turn." The claim is 52.7px, y=678 to 731: "The turn stays 45° and the stretch stays 2√2, for every direction." z² is 44×44, conj is 59×44, and Play is 69.8×44, all at y=739 to 783. WHY YOU'D CARE is y=799 to 818. The why is 105px, y=822 to 928, so the window closes on its first line and the rest is the next thumb. The lede starts at y=928. The status, "Next is 3.1 Differentiable and Analytic Functions. 0 of 3 stages.", starts at y=1013.

In the dark the page is rgb(13, 18, 28) and the sentence is rgb(233, 237, 245). The stage line is rgb(166, 176, 195). The axes stay blue, the short arrow green, the turn orange, the image purple. Same positions. A theme change does not move Play or the square.

Play says Pause, and a second press says Play, with the 45° sentence still the sentence. conj keeps the claim at 52.7px and Play at y=739. A rightward drag stays on the finger while the finger is inside the square (miss 0 through eight samples) and names the point: "At 2.02 + i, the turn is 26° and the stretch is 4.5." When the finger leaves the square the dot stops at the edge, "At 2.4 + i", and a further move does not pull it. A press that starts 26px from the dot leaves 1+i and the 45° sentence. The drawn dot is 9.5px across, inside the 44px grab. At 1280 a 48px drag stays on the finger, miss 0, and the claim is "At 1.76 + i, the turn is 30° and the stretch is 4.04."

**1280×800, light and dark.** Same boxes. The menu button is hidden and the sidebar is the list. The square is 304px, y=240 to 544. The gesture is one line. Play ends at y=691. The why ends at y=783.5, inside 800, in both themes. The lede, "Three stages, from the derivative to a harmonic conjugate.", runs y=783.5 to 809.5, so the 800 edge cuts that line. The status starts at y=843. Fresh, the stage line is "3.1 · Differentiable and Analytic Functions · 0 of 3".

### The drawer, Back, and the climb

At 390 the menu is 8 rows, each 44×358. Chapter 3 is the current row. The drawer covers the page, body overflow is hidden, and `#view` is inert. Escape closes it and returns the page. The rows are The Book and chapters 1 through 7. At 1280 the same list is the sidebar. Chapters 3 and 4 wrap to 46.8px. The others stay 44.

`history.scrollRestoration` is manual. From scrollY 900, The Book opens `#book` at 0. Browser Back returns `#chapter-3` at 900. From 1400, Back returns 1400. A cold Open Chapter 3, with nothing stored, opens `#chapter-3` at 0 on the 3.1 line.

The 3.1 flag is 44×44. Its href is `#chapter-3-3-1`. Tapping it leaves the title "Chapter 3" and puts the memory list at y=72. `#chapter-3-3-3` puts Harmonic Functions at y=121.5, under the 56px header, with the why, the 324px picture, the drag sentence, the right-angle claim, and Conjugates and Circles. Those two chips are 44px tall and end at y=847, so the border sits on the 844 edge and the label is on the screen. `#chapter-3-3-2` is the same pattern: the title at y=121, the why, the square, "Drag the green corner.", the square sentence, and Turn and Stretch ending at y=847.

Mark stage complete, scrolled into view, renames the button to Stage complete, sets aria-pressed, paints a 4px green left edge, and writes `mv:progress.test2` as `{"3.1":true}`. The flag becomes "3.1 · STAGE COMPLETE". The summit sentence is already on that screen. 3.2's title is 98px under the button, and its why is on the screen. The status, off this screen, becomes "Next is 3.2 The Cauchy-Riemann Equations. 1 of 3 stages."

The line under the chapter title does not stay with the picture. After that mark, a reload opens the phone at scroll 0 on the derivative square, z² pressed, the 45° sentence, and the line "3.2 · The Cauchy-Riemann Equations · 1 of 3". The same line sits over the same square at 1280, light and dark. The opening picture is still camp 3.1. The kicker names camp 3.2.

The way up is the other mislabel. At 0 of 3, `#book` on the phone shows Open Chapter 3 at y=265, 324×44, filled rgb(47, 62, 92), and the status "Chapter 3: 0 of 3 stages. Next is 3.1 Differentiable and Analytic Functions." Walk Chapter 4 is on that same screen, y=581, 324×44. Chapter 4's card is `data-state="next"`. The lede is "Eleven chapters, in the order Howell and Mathews print them." The drawer that opened this page lists chapters 1 through 7. The roadmap still lays out 8 Residue Theory through 11 Fourier Series and the Laplace Transform, from y=2108 to y=2527. With 3.1 stored, the same two buttons are on the first screen and the status counts 1 of 3, next 3.2. The three section rows are 44px links to `#chapter-3-3-1`, `-3-2`, and `-3-3`.

The last Mark stage complete button and the chapter source line are 49px apart. The path's bottom padding is 0. The page does not end on an empty screen.

### Style

Same system as chapter 4, measured at 390. Light: the paper is rgb(246, 243, 236), the text is rgb(26, 34, 48), a card is white with a 1px rgb(216, 210, 196) border and radius 10px. Dark: the paper is rgb(13, 18, 28), the text is rgb(233, 237, 245), a card is rgb(21, 28, 43), radius 10px, which is the dark card chapter 4 uses. Play is the 44px button, radius 6px. Shown text inputs are 44px. The home wordmark is 237×30, the existing header, and the same control chapter 4 has. The chapter's own controls clear 44. Citation links in the prose are the short lines they already were. No new type and no new colour.

### Ranked

1. **The line under the title names the picture on the screen.** Evidence: a fresh phone reads "3.1 · Differentiable and Analytic Functions · 0 of 3" over the derivative square, and that line fits. After Mark stage complete, a reload at 390 and at 1280, light and dark, reads "3.2 · The Cauchy-Riemann Equations · 1 of 3" over the same square, with z² pressed and the claim still "The turn stays 45° and the stretch stays 2√2, for every direction." The status card, at y=1013 on the phone, is the line that already says "Next is 3.2". Change: the kicker keeps 3.1's name while this opening picture is the derivative, and the count updates, so the reload reads "3.1 · Differentiable and Analytic Functions · 1 of 3". Leave "Next is 3.2" on the status card.

2. **One door while this mountain is unfinished.** Evidence: at 0 of 3, Open Chapter 3 is 324×44 at y=265 and Walk Chapter 4 is 324×44 at y=581, both inside the 844 window. The status says the next stage is 3.1. Chapter 4's card is `data-state="next"`. With 3.1 stored, both buttons are still on the first screen. Change: until 3 of 3 stages are marked, the card shows Open Chapter 3 only, and Chapter 4's flag does not say Next. Walk Chapter 4 returns when the status says Chapter 3 is done.

3. **The book counts the chapters the drawer counts.** Evidence: the lede on the first screen is "Eleven chapters, in the order Howell and Mathews print them." The open drawer is The Book and chapters 1 through 7, each row 44px. The roadmap still has chapter 8 at y=2108 and chapter 11 at y=2527. Change: the lede says seven chapters. The roadmap lists chapters 1 through 7. Chapters 8 through 11 stay in the data and off this list.

4. **The laptop's first screen ends on a whole line.** Evidence: at 1280×800, light and dark, the why ends at y=783.5, inside 800, and the lede "Three stages, from the derivative to a harmonic conjugate." runs y=783.5 to 809.5. The opening square is 304px. On the phone that lede is at y=928, and Play ends at y=783 with the square at 324px. Change: the lede finishes inside 800. The phone square stays the column width. A tighter height cap on the laptop square does that, about 10px, and it does not change the 324px phone square.

### Keep

The 324px phone square, the 45° sentence, the gesture line, and Play on the first screen, in both themes. The why starts on that screen. Do not shrink the square to pull the rest of it up. conj keeps the claim at 52.7px and Play at one y. The dot stays under the finger inside the square, a press 26px out changes nothing, and past the frame the dot stops. The four teaching colours. The Book at 44px. Back restoring scrollY 900 and 1400. The 44px flag, the memory list at y=72, and `#chapter-3-3-3` with the title at y=121. Mark stage complete, the green edge, and 3.2's title and why 98px under that button. The drawer, chapters 1 through 7, the cover, and Escape. Shown inputs at 44px. The source line 49px under the last camp. No sideways scroll. The type, the paper, and the cards, shared with chapter 4.

## reviewer (ch3 batch 4)

Reviewed `63cbc5e` on `cursor/chapter-3` (PR #46) against Howell & Mathews, Complex Analysis, 202 Updated Edition. One fix landed on the branch: the Exercise 1(a) note now says the key's quadratic is not \(g'(z)\), and it no longer prints the derivative of \(h\). Not merged. gh-pages untouched.

### Verdict

ACCEPT WITH FIXES

Checked against the professor PDF (complexanalysis.org, 471 pages, title page "202 Updated Edition"). Printed pages 79–101 and the selected answers on 435–436. Chapter pins match those pages: Equation (3.1) and Example 3.1 on 79; Definitions 3.1 and 3.2, the singular-point sentence, and (3.4)–(3.12) on 81; Theorem 3.1 on 82; Theorem 3.2 and Exercises 1–3 on 83; Exercises 7 and 11 on 84; Theorem 3.3 and (3.14)–(3.16) on 86; Example 3.4 on 87; Example 3.6 on 88; Theorem 3.4 on 89; Theorem 3.5 and (3.22) on 91; Theorem 3.6 on 92; Theorem 3.7 and Exercises 1, 3, and 7 on 93; Laplace (3.26), Theorem 3.8, and the conjugate definition on 95; Example 3.11 on 96; Theorem 3.9 and (3.27) on 97; Exercises 2 and 5 on 100.

The five new cards compute the book's answers. Exercise 1(b) is \(h'(z) = 3/(z+2)^2\), singular at \(-2\). Exercise 3: \([f]^3\), \(fg\), \(f(z-1)\), and \(f(g(z))\) must be entire; \(f/g\) and \(f(1/z)\) need not. Exercise 1(b) of §3.2 is \((y+ix)/(x^2+y^2) = i/z\) for \(z \neq 0\), with \(f' = -i/z^2\). Exercise 3 is \(a = 1\), \(b = 2\). Exercise 2 of §3.3 has Laplacian \(6x+6y\), so no such analytic \(f\). The answer key on page 435 prints \(15z^2-8z+7\) for 1(a) and files \(h'\) under 1(c). The card's derivative stays \(5(z^2-iz+9)^4(2z-i)\). A wrong last step on Exercise 7(a) does not print \(-4i\); \(4(-i)\) is accepted and then the why shows it.

Generators recompute. Four hundred random polynomials in \(z\) of degree 2 or 3 had Laplace zero, passed Cauchy-Riemann, and rebuilt \(\operatorname{Im}(f)\) from \(\int u_x\,dy\) plus \(C(x)\). Two hundred generator seeds threw nothing, and each answer sat in its choices. The real-axis family is Exercise 1(g): \(f' = 2ax\) only on \(y = 0\). The origin family is the \(|z|^2\) pattern, \(f'(0) = 0\).

Pictures. \(z^2\) at \(1+i\) is a turn of \(45^\circ\) and a stretch of \(2\sqrt{2}\). A turned square stays a square through a half-turn of samples. Stretch at angle 0 is a rectangle; at \(45^\circ\) the sides are equal and the angle is not. Conjugate levels of \(x^2-y^2\) and \(2xy\) meet at a right angle except at the origin. Circles do that only on the diagonal. A drag clamps to the drawn square.

On the preview, at 390×844, the five cards graded in place: a wrong numerator on the quotient stayed on the step, \(b=2\) and \(a=1\) passed, \(a=-1\) did not, \(6y+6x\) passed, and "does not exist" was the right choice for \(v = x^3+y^3\). No console errors. `node tools/check_vectors.mjs` 234/234, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` passed. No live file imports `kit/`. `js/core/map-route.js` is byte-identical to `kit/template/js/core/map-route.js`.

### Leftovers

1. The local card is still the renderer. Exercise 2's second step is a choice list inside a `next-step-blank` item. The local card treats any step with `choices` as multiple choice. A shared renderer that keys off the item kind would turn that step into a typed blank.
2. Theorem 3.5 is still a flash. Exercise 10, the polar proof, is not a card. Theorem 3.6's constant-modulus proof is not a card.
3. `#book` still has to grow "Open Chapter 2" when that branch meets this one. The Chapter 3 button is already on the page.
4. The Theorem 3.4 flash memory line is the short form, "Cauchy-Riemann plus continuous partials." The flash back and the §3.2 recipe state the neighborhood, the partials continuous at the point, and the equations at the point.

## unslop (chapter-3 batch 4)

Preview https://ch3-preview.complexanalysis.pages.dev/#chapter-3, tip `63cbc5e`. The served `js/book/chapter3.js`, `js/book/ch3-pictures.js`, `css/components.css`, and `data/practice/ch3.json` match that commit. Phone 390×844 first, touch, light then dark, then 1280×800, light then dark. A rightward drag from 1+i, a drag to the frame and past it, Play, then Pause. §3.2, §3.3, Exercise 1(a), Exercise 3, the rational card, the constants card, and Exercise 2. No console errors. No sideways scroll (`scrollWidth` is 390 and 1280). Dark uses the same boxes as light. Body text is rgb(26, 34, 48) in the light and rgb(233, 237, 245) in the dark. No emoji, no gradient, no glow.

## Verdict

ANOTHER BATCH

The phone square fills the card, and the finger holds the dot. The arrows that square is there to show disappear on the way to the frame, and Exercise 3's choices break on that same phone. One batch for the five cuts below. Then this lens rests.

## What the hand does

At rest the point is 1+i. On the phone the square is 324×324, from y=259 to 583, the same width as §3.2 and §3.3. The side gaps are 17px, the card's padding. The green step is 56px, the purple image is 158px, the orange turn is 14×34, and the handle is 9.5px. A rightward drag stays on the finger, miss 0.6px, and the imaginary part stays 1.00 through real part 2.19. At the frame the real part stops at 2.40. The dot stays on that edge while the finger goes on past it.

Play says Pause, and the claim stays "The turn stays 45° and the stretch stays 2√2, for every direction." On the laptop the same drag keeps the miss at 0.3px. Play ends at y=783 on the phone and y=691 at 1280, inside both windows, in both themes.

## What reads as unfinished

**The drag erases the arrows.** From 1+i the green step, the purple image, and the orange turn are on the square. At real part 1.84 the green step is still drawn, about 8 units in the picture. At 1.99 its visibility is hidden. At 2.13 both arrows are hidden. At 2.28 the arc is hidden too. The claim at 2.19 + i still says the turn is 24° and the stretch is 4.82. The square shows a green dot.

**Exercise 3 breaks a formula in the button.** On the phone, light and dark, the four choices sit in 290px buttons. `f(z−1)` draws as a 56×51 block, so the 1 drops onto a second line inside the button, and "and" sits beside the break. The fourth choice is 52px tall with a scroll width of 319: the last formula, `f(g(z))`, runs 30px past the button. At 1280 those four choices are 884×44, one line, and the formula stays inside the button. The prompt above them is whole at both widths. The rational card's four choices (`i/z`, `−i/z`, `1/z`, `iz`) are one line on the phone.

**Exercise 1(a) speaks in the answer key.** Between the prompt and "Step 1 of 3" there is a paragraph, 133px on the phone and 53px at 1280: "The selected-answers key on page 435 prints 15z² − 8z + 7 for this derivative, and it labels h'(z) = 3/(z+2)² as 1(c). h is Exercise 1(b)." The next card is Exercise 1(b), and that derivative is the line it asks for. The card is already on the screen under the note. The paragraph is the unfinished piece. A wording that drops h'(z) and still tells the student what page 435 printed belongs off the card the same way.

**The wide square sits apart from its sentence.** At 1280, both themes, the opening square is 304×304 at x=628. The gesture and the claim start at x=321. The paper between those two left edges is 307px, and the side gaps inside the 952px card are 324 and 324. §3.2 on that window is a 416px square. The why still ends at y=783, inside 800.

**The first screen ends on a fragment.** On the phone, Play ends at y=783. "WHY YOU'D CARE" ends at 818. The why runs from y=822 to 928, so the window cuts it after "A derivative is one number that turns". At 1280 the why finishes, bottom 783, and the next line, "Three stages, from the derivative to a harmonic conjugate.", runs from y=783.5 to 809.5 and is cut by the 800 edge. The stage line already on that screen reads "3.1 · Differentiable and Analytic Functions · 0 of 3".

## Cut

1. **The arrows stay drawn for every point inside the square.** Evidence: on the phone the green step is hidden at real part 1.99, both arrows are hidden at 2.13, and the arc is hidden at 2.28, while the claim still names a turn and a stretch. The finger's miss on that drag is 0.6px and the imaginary part stays 1.00. Change: scale the step, the image, and the turn down so each one is still a mark at 1.99 and at 2.13. The point still stops at real part 2.40 when the finger leaves the frame.

2. **Each formula in a choice stays one piece, inside the button.** Evidence: at 390, `f(z−1)` is a 56×51 block inside a 290×52 button, and the fourth choice's `f(g(z))` extends 30px past the button (scroll width 319). At 1280 the same choices are one line. Change: a choice may break between formulas. `f(z−1)` stays on one line, and every formula ends inside the button, at 390 and at 1280, in both themes.

3. **The answer-key paragraph leaves Exercise 1(a).** Evidence, on the preview: the paragraph sits between the prompt and "Step 1 of 3", 133px on the phone, and it prints h'(z) = 3/(z+2)², the derivative the next card asks for. Change: the card keeps the prompt, the three steps, and the source line. The paragraph goes, including a later wording that still reports what the answer key printed.

4. **The wide square shares the sentence's left edge.** Evidence: at 1280 the square's left edge is x=628 and the claim's left edge is x=321. The why ends at y=783 inside 800. Change: align the opening square with the claim, the edge the sentence already uses. Keep the cap that holds the why inside 800.

5. **The first screen ends on a finished sentence.** Evidence: at 390 the why is cut after "A derivative is one number that turns" (the paragraph runs to y=928 in an 844 window). At 1280 the line "Three stages, from the derivative to a harmonic conjugate." is cut at y=809.5, and the stage line has already said 3.1 and 0 of 3. Change: on the phone this screen ends on Play, and the why starts whole on the next thumb, both sentences. Remove the "Three stages" line. The stage line and the status stay.

## Keep

The phone square at 324px, even with §3.2 and §3.3, and the 17px that is the card padding. The finger on the dot, miss at most 0.6px, imaginary part held at 1, and the stop at real part 2.40. Play on the first screen at both widths, in both themes, and the claim box that stays put when the point moves. The four teaching colours on the axes, the step, the turn, and the image. z² and conj, Turn and Stretch, Conjugates and Circles. §3.2's square filling its frame, and §3.3's two families crossing at a right angle. The five new cards as cards: the quotient, the entire-function question, the rational choices that already fit, the constants a and b, and the imaginary part x³+y³. Their source lines. The Book at 109×44. The kickers, in the site's small caps. No sideways scroll.

## Add

Nothing. No slider, no scrubber, no second clock, no third chip, no new hue.
