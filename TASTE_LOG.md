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

## Chapter 2, batch 1

Branch `cursor/chapter-2`. The page is a mountain of five stages in the book-path voice. Stages 2.1–2.3 each have one drag: green in the z plane, purple in the w plane, blue the set, orange its image. The claim flips. 2.4 and 2.5 are titles and citations.

Checked in headless Chrome at 390×844 and at a wide window, and by dragging. No sideways scroll at 390 or at 360. Both planes of §2.1 sit on the phone together; the changing sentence starts at the bottom edge of that window. §2.2 shows the line x = 2 and the parabola. §2.3 starts with the point outside the disk and the drag puts the image inside. The linear generator’s Another button writes a new computed map. The three required checks passed.

## Next batch

- Draw §2.4 (the jump across the branch cut) and §2.5 (lines and circles under 1/z). The sphere is already a station.
- When `js/practice/` lands, render `data/practice/ch2.json` with that engine and retire the local card.
- Lift the §2.1 claim fully onto the 390px first screen. It currently starts on the last pixels.
- A disk under a linear map, with centre and radius computed, beside the point generator.

## skeptical-student (ch2 batch 1)

I have not had complex analysis. I was on a phone, and I was tired. Preview https://ch2-preview.complexanalysis.pages.dev, tip `656f5c92`. I opened the book and then Chapter 2. Headless Chrome, a touch, 390×844 first, then 1280×800, light and dark. No product code changed. No console errors. No sideways scroll: `scrollWidth` matched the window at both widths, both themes.

### Verdict

ANOTHER BATCH. I could drag the dot and watch the other dot jump. I could not say what a linear map did, what a power did, or what a limit is. The sentence that would have told me sits under a list of links, or it describes a picture that is not on the page. Two of the five stages say the picture is a later batch. Do not add those pictures in this voice. Fix the three I already bounced off.

### Where I got lost

The book, 390×844, light. The card says "Next is §4.1, Exercise 3. 0 of 8 exercises." The button says Walk Chapter 4. Chapter 2 is on that same screen, flagged OPEN, and the names 2.1, 2.2, and 2.3 are links. "Open Chapter 2" is at y = 944, 23px tall, below the fold. I used it anyway.

Chapter 2, first screen. "Five stages. Drag the green point. Blue is the set, orange is its image, and purple is where the point lands." Then "Next is 2.1. 0 of 3 stages marked," and no button. Then a paragraph about a turn, a stretch, and a slide, then two squares. The green dot is 7px across (6.8 measured). Dragging the corner of the square does nothing. Dragging the dot does: it crossed the blue line, the purple dot crossed the orange line, and the sentence went from "below the line Im w = 2" to "on or above." I never saw a turn, a stretch, a slide, or a half-plane. Those words are the worked paragraph at y = 1288, after seven textbook links. That list starts at y = 1002 and is 251px tall. The claim itself starts at y = 838 in an 844px window, so the first screen ends on "Drag the green point across the blue line." The same cut in the dark. At 1280×800 the squares are 455px and start at y = 500, so the first screen is the top of the squares and the claim is at y = 1023. The purple dot sits on the bottom edge. Light and dark, same crop.

2.2 opens with a ray, roots, the exponential, and the Julia set. I do not know what a Julia set is. The picture is a vertical line and a curve. On arrival the sentence says the image "has left" the parabola, which is strange, because I had not put it there. Dragging the dot onto the line puts the purple dot on the curve, and that sentence is true. The summit says z^n opens a sector. I never saw a sector or a root.

2.3 opens with two paths into one point, and a derivative. The picture is one dot, a circle, and a mirror of that dot. The instruction says into the disk and off the centre. The centre is drawn as a dot, so that is where the finger went (the drag landed at re = 1, im = 1). The sentence became "Definition 2.4 skips z0. Move off it." I never got the sentence about δ = ε, and I never saw two paths.

Practice. Exercise 13 asks where (2+i)z − 2i sends −2+i. The picture I had just dragged was a different map, and nobody showed the multiplication. I typed hello. The page said "Not yet." The next card is another map I have not seen, w = (−2−i)z + (i), and a blank. Then "What is a complex function," 1 of 9, with Show the back. Under that closed card the Memory list already prints "One z, one w," "Into means the image fits inside S," "Inverse image: who landed here?" and six more, and the Summit is starting: "A linear map turns the plane, stretches it, and slides it." I could read the ending without doing the stage. Stage complete did not care. After one tap the status was "Next is 2.2. 1 of 3 stages marked." Go to 2.2 did scroll me there. That part is clear.

2.4 and 2.5 each say "Title and citations. The picture is a later batch." Nothing to drag, nothing to mark. The next screen is blank except "Back to the book" at the bottom. The page is about 10000px tall and the 2.5 card ends near y = 9068. After I marked all three, the status said "Done. 3 of 3 stages. Sections 2.4 and 2.5 are titles." Back to the book landed at the top. The status was still the Chapter 4 exercise, the flag was still OPEN, and the Done marks on 2.1–2.3 were below the fold.

### Ranked

1. **Put the sentence that changes on the first screen, and put the formula in it.** Evidence: at 390×844 the claim starts at y = 838, so six pixels of it show. At 1280×800 the claim is at y = 1023, under a 455px crop. The map w = iz + i is the worked paragraph at y = 1288, after a 251px list of links. Change: drop the status card and the second "drag the green point" from above the squares, so both planes and the full claim sit above y = 844. The claim names the map: right of the blue line, the purple point is on or above Im w = 2, because w = iz + i. The seven links move to after the summit. On a laptop, cap the squares so that same claim is inside the 800px window.

2. **Make the opening and the summit describe the drag I can actually do.** Evidence: 2.2 talks about a ray, a root, and the Julia set, and the summit is a sector opening; the drag put a point on x = 2 and the purple point sat on a parabola. 2.3 talks about two paths and a derivative; the finger hit the centre dot and the page said "Move off it." Change: 2.2's opening and summit say a vertical line goes to a parabola. Save sector, root, and Julia for a picture that shows them. 2.3's opening says the conjugate mirrors the point, and the image is inside the orange disk when the green point is inside the blue one and off the centre. Start the green point in that good place, so the first sentence is the success and dragging out flips it.

3. **Ask me for the map I just watched, and don't print the answers under the question.** Evidence: Exercise 13 is a different formula from the picture, a wrong try says only "Not yet," and under the closed card "1 of 9" the Memory list and the start of the Summit are already on the screen. Change: one image of iz + i filled in, the next number blank, and a miss says "a number like 3+2i." Hold the nine definition cards until those words have appeared in a sentence on the stage. Hide the Memory list until the card is finished.

4. **The summit is the line I just made true, and Stage complete waits for it.** Evidence: the 2.1 summit starts just under the memory list, past y = 2700, and Stage complete is live on arrival. I tapped it after one check. Change: once the claim has been true, show that summit sentence under the picture, and only then enable Stage complete.

5. **Stop telling me the page is unfinished in your voice.** Evidence: 2.4 and 2.5 say "Title and citations. The picture is a later batch." The done line says they "are titles." After them, one screen is empty except Back to the book. Change: one line a student can read, "The branch cut is not drawn on this page yet," plus the book link, or leave the stage out of the scroll. Delete "later batch" and "are titles." No blank screen after the last card.

6. **The book should admit I was in Chapter 2.** Evidence: the obvious button is Walk Chapter 4. Open Chapter 2 is 23px tall at y = 944. After the three marks, Back returned to scroll 0, the status was still the §4.1 exercise, and the chapter flag was still OPEN. Change: while 2.1 is next, the first button is Open Chapter 2, 44px tall, on the 390 screen. After the three marks, the status says 2.1–2.3 are marked. Back from the chapter returns to that card.

### What to keep

The drag is the one thing that taught me. The green point moves, the purple point follows, and the sentence flips. I saw it in the light and in the dark: below the line, then on or above; off the parabola, then on it. The colour words in the lede are short enough to use. Go to 2.2, once it appeared, is one tap and it moved. The worked paragraph for 2.1, once I found it, is the lesson: a quarter turn, then up by 1, and the half-plane goes to a half-plane. That sentence stays. It is in the wrong place. "One z, one w" is a line I would remember. The other eight, not yet.

## pedagogy (ch2 batch 1)

Preview https://ch2-preview.complexanalysis.pages.dev, branch `cursor/chapter-2`, tip `656f5c92`. Walked as a student in headless Chrome with touch: the book, then Chapter 2, at 390×844 and then 1280×800, light and then dark. No product code was changed. No console errors. No sideways scroll at either size.

### Verdict

ANOTHER BATCH

Each walked stage has the skeleton the chapter asked for: a why, one drag, a worked label, practice, a memory list, a summit sentence, and a Stage complete button. The drag teaches, and the sentence it teaches is a different sentence from the summit. The worked block is a citation. Stage complete can be pressed before any of that, and the page will say Done while §2.4 and §2.5 are still captions.

### How the walk went

The book's first screen at 390 says "Next is §4.1, Exercise 3" and the button is Walk Chapter 4. Chapter 2 is on that same screen, flagged OPEN, with §2.1 through §2.4 as links. Following the button walks a different chapter. Opening Chapter 2 from the link does land on the mountain.

Chapter 2, 390, light, fresh storage. The first screen is the title, the lede "Five stages. Drag the green point. Blue is the set, orange is its image, and purple is where the point lands.", the source line, "Next is 2.1. 0 of 3 stages marked.", the §2.1 why ("a turn, a stretch, then a slide"), both planes, and "Drag the green point across the blue line." The changing sentence starts at y = 838 in an 844px window, so the first screen cuts it. The green dot is 6.9px across. Dragging it from the left of the blue line to the right flips the sentence from "The image is below the line Im w = 2" to "The image is on or above the line Im w = 2", and the purple point crosses the orange line. That correspondence holds. It is the lesson the hand can check. The map on the page is w = iz + i, which turns and slides. The modulus of i is 1, so this picture has no stretch, and the half-plane is the line, not a shaded side.

The same screen in the dark keeps the paper, the type, and the four colours. At 1280×800 the planes are large and the dot is about 20px. The claim sits at y = 1039, under an 800px window, so the first desktop screen is the why and the tops of the two planes.

Under the §2.1 picture the page continues with seven pinned links, the worked paragraph, Exercise 13 as a blank, a generated linear image, a deck of 9 cards, nine memory lines, the summit at y = 2698, and Stage complete. The §2.2 summit is at y = 5290. The §2.3 summit is at y = 8254. The page is 9937px tall.

§2.2. Off the line the sentence is "The image has left the parabola of the line x = 2." With the point on the line (Re z = 2) it becomes "The image sits on the parabola u = 4 − v²/16." The worked paragraph directly above the choices already says "The line x = 2 goes to the parabola u = 4 − v²/16." The first choice is that equation. Choosing u = 4 − v²/4 turns the border red (`rgb(179, 38, 30)`), leaves the other choices open, and shows no sentence. The right choice then explains v = 4y, so y = v/4 and u = 4 − y². The distractors are the real mistakes: the coefficient for a different line, the axes swapped, the wrong constant.

The sector card is where the summit's idea appears. Three presses of Another left it on w = z² and 0 < arg z < π/4, and the true choice stayed 0 < arg w < π/2. The linear Another does write a new map. It moved from (−2 − i)z + i at z = −3 − i to −2z + (−2 + i) at z = 2 − 3i.

§2.3. The why says that two paths into one point can disagree, and then the limit is not there. The picture is the conjugate at 1 + i, a limit that exists. Outside the disk: "The image is outside that disk." On the centre: "Definition 2.4 skips z₀. Move off it." Inside: "The image is inside the disk of radius 0.75. Here δ = ε." Those three sentences match the drag. The summit says the limit exists only when every path agrees, which is the same as the two real limits agreeing. One point is one path.

§2.4 and §2.5 are a flag, a title, a page, the sentence "Title and citations. The picture is a later batch.", and two links. The branch cut and w = 1/z are the payoff the earlier whys point at (roots, the argument, the sphere), and a student cannot walk them.

Pressing Stage complete on §2.1, §2.2, and §2.3, with §2.1 pressed before its practice, sets the status to "Done. 3 of 3 stages. Sections 2.4 and 2.5 are titles." and the button to Back to the book.

A blank answered "nope" on Exercise 13 shows "Not yet." and keeps the reason hidden. The answer −5 − 2i shows "(2 + i)(−2 + i) = −5, then subtract 2i" and a Next step. The memory line stays hidden until the last step. That part is the right shape.

The §2.1 deck opens on "What is a complex function, and what are the image, the domain, and the range?" as card 1 of 9. The page has not stated that definition. Show the back reveals it. Knew it advances. After Knew it through the deck, a card is still offered and the line reads "2 of 9. Not due yet." The memory list under the deck is the nine one-line slogans. "Apply Az + B to each vertex" and the other recipes stay on the problem cards.

### Ranked cut or fix

1. **Make the summit the sentence the drag just made true.** The §2.1 why and summit say a linear map turns, stretches, and slides, and a half-plane stays a half-plane. The drag checks a point against Im w = 2 under w = iz + i. Change: the summit on this picture is "Multiplication by i is a quarter turn, adding i slides the plane up by 1, and Re z ≥ 1 lands on Im w ≥ 2." Shade the half-plane, or leave a short segment so the quarter turn is visible. Keep "turn, stretch, slide" on the memory card, and show a stretch on a map whose multiplier has modulus other than 1. The §2.2 why and summit are about an angle multiplied by n. The drag checks a vertical line against a parabola. Change: the live picture is a ray or a sector whose angle widens, which is the sentence already written. Move the parabola under Worked. The sector card has to change the angle when Another is pressed, and the true choice has to change with it. The §2.3 why promises two paths that disagree. The drag shows three honest states of the conjugate, including the punctured centre. Change: the summit is "For the conjugate, the image disk has the same radius, so δ = ε, and the definition skips z₀." A path that disagrees is a second picture, on a later visit to this stage.

2. **Work one example, then take the steps away.** Worked is one citation sentence. On §2.2 that sentence prints u = 4 − v²/16 in the paragraph above the choices, and the on-line claim prints it again. Change: work the line x = 1 in full, with the algebra visible, then ask x = 2 with the equation removed from the paragraph and from the claim. The claim can say "on the curve" and "off the curve." Exercise 13 should show the image of the first vertex already done, ask for the second, then ask for the third, and then ask what shape the triangle became. The two Theorem 2.1 cards are isolated sentences. Put them after a three-line write-up of one direction, and blank the matching step in the other direction.

3. **A miss should name the next move.** "nope" produces "Not yet." A wrong parabola choice produces a red border and no words. Change: a wrong blank says the form ("a complex number, written 3+4i") and keeps the value hidden. A wrong choice says which mistake it is ("v²/4 belongs to the line x = 1", "v = … swaps the axes") and leaves the remaining choices open. Show the reason you already wrote for the right answer only after the right answer, as the page does now.

4. **Stage complete has to be earned, and the mountain has five camps.** The lede says five stages. The counter says 0 of 3, then Done, while §2.4 and §2.5 still say "a later batch." The button toggles with no drag and no correct item. Change: a stage marks complete after the claim has been both true and false and one faded item is right. The summit sentence appears at that moment, followed by the name of the next stage. Count five. Until §2.4 and §2.5 have a picture, their line is the student sentence ("Arg jumps across the negative real axis"; "1/z swaps lines and circles, and 0 goes to the north pole") plus the page link. They stay ahead, and the chapter does not say Done.

5. **Teach the sentence, then ask for it back.** Card 1 of 9 asks for the definition of a function, which this stage never says. The 1-, 3-, 7-, and 21-day ladder is real, and after every card is marked known the deck still offers a back and says "Not due yet." The memory list is the slogans. The recipes that finish an exam question ("Apply Az + B to each vertex", "on x = a, u = a² − v²/(4a²)", "a polynomial limit is the value at the point", "take the smaller δ") stay buried on the problem. Change: three cards, one for each idea the stage just showed, each one sentence stated on the page before the deck. When nothing is due, the deck says when the next card returns and stops offering the back. The memory list is those three sentences plus the recipes.

6. **Put the worked sentence against the picture.** Seven links on §2.1, and nine on §2.3, sit between the drag and the example. The summit then waits under the memory list, at y = 2698 on a phone. Change: why, picture, claim, worked solution, faded practice, summit, Stage complete. The pinned pages move under the summit, as further reading. The student meets the example while the planes are still the thing they are looking at.

### What to keep

The one drag, the two planes, and the four colours in the lede are the same colours on the picture. The sentence under §2.1 flips when the point crosses the line, and the purple point agrees, in light and in dark. The three sentences on the conjugate picture are the best teaching on the page: outside, on the centre the definition skips z₀, inside the disk with δ = ε. The parabola distractors are mistakes a student actually makes. Cards are one at a time, the back stays closed until asked, and Again / Knew it writes a real gap. "Turn, stretch, slide" is an honest mnemonic for the general linear map and belongs on the card. The labels Why, Worked, Practice, Memory, and Summit are the right camps. The linear Another button already writes a new computed map. Citations name the section and the page. Both planes fit on the phone together.

## Chapter 2, batch 2

Council items 1–7, then §2.4 and §2.5 as stages. The reviewer commit `33d993a` and the lens notes above stay.

The first screen at 390×844 holds both planes and the claim that names \(w = iz+i\). The claim ends near y = 694. At 1280×800 the squares are capped near 268px and the claim ends near y = 509 in the light and y = 718 in the dark. The status line is under the five stages, and it says 0 of 5. Stage complete stays disabled until the claim has been true and false and one problem is finished; the summit appears then and names the next stage. A wrong parabola choice says \(v^2/4\) belongs to \(x = 1\) and leaves the other choices open. A wrong blank says a number written like 3+2i. The memory list stays hidden until that card is finished. The sector generator’s correct angle is no longer always \(\pi/2\).

§2.4 opens above the cut: Arg near \(\pi\), square root in the upper half-plane. §2.5 opens on the line \(x = 1\), with \(1/z\) on the orange circle. No sideways scroll, no console errors, light and dark, 390 and 1280. The three checks passed.

## Next

- The practice engine’s `js/book/registry.js` is on `cursor/practice-engine`. This page’s `mount(el, ctx)` reads `ctx.book.focus`, so their one line can point at `./stations/chapter2.js`. Their generator registry still needs `ch2-maps` before the catalog will accept this file.
- A finger still has to catch the parabola. Snap puts the point on \(x = 2\) when it is close, and the sentence is true only then.
- §2.4 does not yet show both sides of the cut in one still. The drag does.

## test-prep-coach (ch2 batch 2)

Preview https://ch2-preview.complexanalysis.pages.dev, branch `cursor/chapter-2`, tip `a0946d2`. Walked as a student with a MAT 412 exam on Howell & Mathews §§2.1–2.5. Headless Chrome, 390×844 then 1280×800, light then dark. Typed equivalent answers and wrong answers into the blanks, and clicked the wrong choices. The live practice file matches this commit (32 items). No product code changed. No console errors. No sideways scroll: `scrollWidth` matched the window at both widths, both themes.

### Verdict

ANOTHER BATCH

The night-before tools are on the page. Theorem 2.1 has a proof blank and a proof multiple choice. Exercise 13 and the polynomial limit are next-step blanks. The parabola, the branch cut, and \(1/z\) are next-step choices. Four deterministic generators write a computed answer. Twenty-one flash cards carry a page in the title. A memory line appears once a card is finished. A wrong number on Exercise 13 is marked right. The proof blank is the sentence printed in the paragraph above it. The memory list has no page on the line, and it stays hidden until the card is already solved.

### What I could sit down and drill

At 390×844, light, the first screen holds both planes and the claim "Right of the blue line, \(w = iz+i\) lands on or above Im \(w = 2\)." The claim ends at y = 694. At 1280×800 the same claim ends at y = 718, inside the 800px window. Dark uses those positions. The paper is rgb(13, 18, 28). Practice starts under Worked, at y = 949 on the phone. Check, each choice, Another, and the blank are 44px tall. The status line reads "0 of 5 stages marked."

Exercise 13, page 54, is a real next-step blank. The image of \(-2+i\) is given as \(-5-2i\). Typing \(-6\) for the image of \(-2+2i\) opens the product and Next step. Typing \(3+2i\) for the image of \(2+i\) opens the next reason. "triangle" finishes the card, and the line that appears is "Apply \(Az+B\) to each vertex." Exercise 1(a), page 66, accepts \(3+4i\) for \((2+i)^2\) and rejects \(4+4i\), which is the square before \(i^2 = -1\).

Exercise 1(b), page 59, asks for the parabola of \(x = 2\) after the worked paragraph has done \(x = 1\). The claim under the picture says the point sits on the orange curve, and it does not print the equation. Choosing \(u = 4 - v^2/4\) turns that button red, leaves the other three open, and says "\(v^2/4\) is the image of the line \(x = 1\)." The branch card does the same for \(i\): "\(i\) is the limit from above the cut." The circle card names \(|w - 1/4| = 1/4\) as the image of \(x = 2\).

The linear generator opens on \(w = (2+2i)z + (1-i)\) at \(z = -1-2i\). The image is \(3-7i\). Typing 999 stays wrong. Typing \(3-6i\) stays wrong. Typing \(3-7*i\) is accepted, and the reason is the product \((2+2i)(-1-2i)+(1-i) = 3-7i\). Five further presses of Another wrote five further maps. Across seeds 1 through 60 the arithmetic matched the printed image, and 55 of those images were different. A wrong answer on that card can fail.

Flash cards are one at a time. The back of "What is a complex function…" stays closed until Show the back, and the title is "§2.1, function, page 43." Knew it walks image, into, inverse image, one-to-one, translation, rotation, magnification, and the linear map, on pages 46, 48, 49, and 50. The eight §2.3 cards state Definitions 2.3–2.6 and Theorems 2.1–2.4, each with its page.

### Where the cram breaks

**\(0-6i\) is marked correct for \(-6\).** On Exercise 13, at 390 and again at 1280, I typed `0-6i`. The blank locked, Check went grey, and the card showed \((2+i)(-2+2i) = -6+2i\), then subtract \(2i\). \(0-6i\) is \(-6i\). The accept list is what lets it through. `hello`, \(-6+2i\) (the product before the slide), and `2i-6` stay wrong. The only hint on those is "A number written like 3+2i."

**The exam blanks reject equivalents the generator accepts.** On the image of \(2+i\), I typed `2i+3`, `3+2*i`, `3.0+2.0i`, and `(3+2i)`. Each is \(3+2i\). Each came back wrong, with that same hint. `3+2i` then passed. On the limit, `4i+3` and `3+4*i` were rejected and `3+4i` passed. On the generator, `3-7*i` passed, and `-7i+3` and `(3-7i)` did not. "right triangle" and "the triangle" were rejected on the last blank of Exercise 13. The miss said "A shape, such as a triangle." The three given vertices meet at a right angle, and multiplication by \(2+i\) keeps that angle, so the image is a right triangle. The modulus blank accepts `|f(z)-w0|` and "the modulus of \(f(z)-w_0\)". It rejects `|f(z)-w₀|` and \(\sqrt{(u-u_0)^2+(v-v_0)^2}\), which is the same modulus.

**A miss on the proof tells you to write a complex number.** The Theorem 2.1 blank asks what \(|u-u_0|\) is at most. I typed `3+2i`. The line under the box was "A number written like 3+2i." The next blank asks for the word in "the ___ of \(\delta_1\) and \(\delta_2\)." I typed `maximum` and got the same sentence. On the proof choices, \(\varepsilon/2\) (one half, before the two halves are added) got the same sentence, and the other choices stayed open. The generated parabola's sign error, \(u = 9 + v^2/36\), got that sentence too, with all four choices still open. The sector generator, on the same page, says "That multiplies the fraction by \(n\) in the wrong place."

**The proof and the branch answer sit in the paragraph above the question.** The §2.3 worked paragraph says: if \(|f(z)-w_0| < \varepsilon\), then \(|u-u_0| \le |f(z)-w_0|\), and the other direction takes the smaller of the two deltas. The blank underneath is that inequality, and the next blank is that word. The §2.4 paragraph says the square root from below approaches \(-i\). The choice card's correct button is \(-i\). The opening claim on that stage already puts the square root from above in the upper half-plane.

**The sheet is a prize, and the line has no page.** Memory is hidden on arrival. It appears under Further reading, after the card is finished. The line Exercise 13 earned was "Apply \(Az+B\) to each vertex." The page, 54, is the card title, up the page. None of the 32 memory lines in the file carry a page. After all nine §2.1 cards were marked known, the deck said "1 of 9. Not due yet" and Show the back was still on the card. Each Knew it appended the slogan again, so the sheet listed "One z, one w." twice, then the other eight lines, then "One z, one w." again. No card asks for the roots of a number. The two §2.2 flashes state Definition 2.1, page 55, and Definition 2.2, page 59. The exam question is a number: halve the argument, or add \(2\pi k/n\).

**Another is often the same line.** The parabola generator opened on \(x = 3\). The next presses were \(x = 1\), \(3\), \(3\), \(1\), \(3\), and then \(x = 2\). \(x = 1\) is the line the worked paragraph just finished. \(x = 2\) is Exercise 1(b), the card directly above. The reciprocal generator's second item was \(x = 1\), the circle the card above already asks for. Three vertical lines is a few. The button reprints them. The sector generator does cycle six angles, from \(0 < \arg w < 2\pi/3\) through \(0 < \arg w < 2\pi\), and a wrong choice explains itself. The linear generator is the one that keeps writing a new map.

### Ranked

1. **Reject \(0-6i\).** Evidence: typing `0-6i` on Exercise 13 locked the blank and revealed the reason for \(-6\), at both widths. \(0-6i\) is \(-6i\). Change: delete `0-6i` from that accept list. Grade every complex blank by the parsed value, the way the linear generator already does, so \(-6\), \(-6+0i\), and \(-6.0\) count, and \(-6i\) does not.

2. **Accept the forms a student actually writes.** Evidence: on the image of \(2+i\), `2i+3`, `3+2*i`, `3.0+2.0i`, and `(3+2i)` were rejected, and `3+2i` passed. The generator accepted `3-7*i` and rejected `-7i+3` and `(3-7i)`. "right triangle" was rejected while the miss named a triangle. Change: put the real and imaginary parts on Exercise 13, on both limit blanks, and on every generated linear item, and accept a parse in either order, with a star, with parentheses, or with a trailing `.0`. Accept "a triangle", "the triangle", and "right triangle" on that last blank. On the modulus blank, accept \(|f(z)-w_0|\) and \(\sqrt{(u-u_0)^2+(v-v_0)^2}\).

3. **A miss names the mistake.** Evidence: `3+2i` in the modulus blank, `maximum` in the delta blank, \(\varepsilon/2\) on the proof choices, and \(u = 9 + v^2/36\) on the generated parabola all returned "A number written like 3+2i." The shape miss was "A shape, such as a triangle." The static parabola, on the same page, says "\(v^2/4\) is the image of the line \(x = 1\)" and leaves the other choices open. Change: the modulus miss says the bound is \(|f(z)-w_0|\). The \(\varepsilon/2\) miss says the two halves add. The delta miss says the smaller of \(\delta_1\) and \(\delta_2\). The generated parabola gets a line for the sign error and a line for the swapped axes. The shape miss stops containing the answer.

4. **The sentence above the blank is a different example.** Evidence: the §2.3 paragraph states \(|u-u_0| \le |f(z)-w_0|\) and "the smaller of the two deltas" immediately above those two blanks. The §2.4 paragraph states that the square root from below approaches \(-i\), and \(-i\) is the correct choice. Change: work the filled proof on one function, and blank the matching step of Theorem 2.1 without that sentence still on the screen. On §2.4 the paragraph says Arg jumps. The value \(-i\) stays inside the card until it is chosen.

5. **Open the memory sheet with the page on the line.** Evidence: the sheet is hidden on arrival and sits under Further reading. The earned line was "Apply \(Az+B\) to each vertex" with no page. Marking the deck known appended "One z, one w." a second time, and the deck said "Not due yet" while Show the back stayed up. Change: the sheet is visible when the stage opens, above Practice. Each line is the recipe and the page. "Apply \(Az+B\) to each vertex. Page 54." "On \(x = a\), \(y = v/(2a)\) and \(u = a^2 - y^2\). Page 59." "A complex limit is the two real limits. Take the smaller \(\delta\). Page 62." "Arg jumps across the negative real axis. Page 68." "On \(x = a\), \(|w - 1/(2a)| = 1/(2a)\). Page 72." "The \(n\) roots: modulus to the \(1/n\), argument \((\operatorname{Arg} + 2\pi k)/n\), \(k = 0,\ldots,n-1\). Page 59." One copy of each line. Show the back stays available the week of the exam.

6. **Another should be a new problem, and one of them should be a root.** Evidence: the parabola generator opened on \(x = 3\), then the presses were \(x = 1, 3, 3, 1, 3\), and then \(x = 2\), the exercise above it. The reciprocal generator's second item was the \(x = 1\) circle already on the card. No item asks for a square root or an \(n\)th root of a number. Change: the parabola and reciprocal generators draw a line that is not the worked line and not the card above, and a press changes the line. Add one deterministic root item, a few fixed numbers or an endless seed, with the answer computed from the argument. A choice that forgets \(2\pi k\), or halves the wrong angle, carries a sentence the way the sector card already does.

### Keep

The card titles carry the section and the page: Exercise 13 page 54, Theorem 2.1 page 62, Definition 2.1 page 55, Section 2.4 page 68, Section 2.5 page 72. Exercise 1(b), the branch card, and the circle card name the mistake and leave the other choices open. The linear generator computes the image, rejects a wrong number, and accepts \(3-7*i\). Flashes are one card, the back stays closed, and the cite is the title, pages 43 through 64. The \(x = 2\) parabola is asked after \(x = 1\) is worked, and the claim does not print the equation. The \(1/z\) card asks for \(x = 1\) after \(x = 2\) is worked. At both widths and in both themes the claim is on the first screen, the controls are 44px, nothing scrolls sideways, and the console stays quiet.

## unslop (ch2 batch 2)

Read heydamir/unslop at `a6f121ee` (polish only; `kit/SKILL.md` wins where they disagree). The walk is the preview and tip `a0946d2`: `js/stations/chapter2.js` and `js/stations/ch2-picture.js` on https://ch2-preview.complexanalysis.pages.dev matched that commit. Headless Chrome, 390×844 then 1280×800, light then dark, `#chapter-2`, all five stages. A drag on each picture in the light, and a drag of §2.4 to the left edge. No product code changed. No console errors. No sideways scroll: `scrollWidth` was 390 and 1280. Commit `c4c73c7` landed on this branch during the walk. It rewords the §2.5 sentence quoted in item 2, and it does not close the six fixes.

The page is already this book. Warm paper, a serif title, four teaching colours on the planes, quiet chrome. Light paper is `#f6f3ec`, dark paper is `#0d121c`. Blue, orange, green, and purple are `#0b63ad`, `#a84300`, `#006e53`, `#9d3a8a` in the light and `#62adf2`, `#ff9d5c`, `#3fd0a0`, `#e48fd2` in the dark. No gradient, no glow, no emoji, no badge, no pulsing control. The uppercase kickers are the book path. This pass leaves them.

The moment is the pair of planes. At 390 the first screen holds both squares and the claim: the squares are 158×158 from y = 448, and the claim ends at y = 694, in the light and in the dark. At 1280 the squares are 268×268, the pair is 544px wide inside a 952px card, and the claim ends at y = 718 in an 800px window, again in both themes. A drag on §2.1 moves the sentence from “on or above Im w = 2” to “below.” The square’s outline stays `none`.

### Verdict

ANOTHER BATCH

One batch, these six, then this lens rests. The picture, the colours, and the first screen already hold. What is left is copy and marks that still look like the draft: an empty heading, a sentence about a different line, caret math on the buttons, and a 5px dot the frame can cut.

### Ranked

1. **Hide the Summit heading until the sentence is there.** On every stage, at both sizes and in both themes, the heading SUMMIT is showing and the sentence under it is hidden. The next thing is the disabled Stage complete bar. On §2.4 that is the block under the flash card: the heading, then a grey “Stage complete.” Change: hide that heading with the sentence. When the stage is earned, show the heading and the sentence together. The button stays, and it stays disabled until then.

2. **The §2.5 worked paragraph should be the line on the screen.** The picture opens on \(x = 1\), and the claim says \(1/z\) sits on the orange circle. The paragraph under Worked is the algebra for \(x = 2\), and then the sentence “The picture uses a different vertical line.” The practice card under it asks for the circle of the line the picture already shows. `c4c73c7` changes that sentence to “The picture uses the line \(x = 1\)” and cites Example 2.24 for the \(x = 2\) circle. The picture is still \(x = 1\), and the paragraph above it is still \(x = 2\). Change: the worked lines are \(x = 1\) and \(|w - 1/2| = 1/2\). The circle for \(x = 2\) stays in the practice.

3. **The practice formulas should be the same math as the paragraph above them.** §2.2’s buttons read `u = 4 - v^2/16`, `u = 4 - v^2/4`, `v = 4 - u^2/16`, and `u = 2 - v^2/16`, each 143×44, under a prompt set in KaTeX. §2.5’s buttons read `|w - 1/2| = 1/2` and `|w - 1/4| = 1/4`. §2.3’s prompt says “u0 + iv0”, and one choice says `|z - z_0|`. Change: render those labels and that prompt with the same math as the worked paragraph, so the caret and the underscores go. The plain forms can stay in the accepted answers.

4. **The four root choices should be one row.** On §2.4, at both widths and in both themes, the choices are `-i`, `i`, `1`, and `-1`, each 49×44, stacked. The card beside them is 358px on the phone. Change: one row of four targets, each at least 44px, the same height. Four symbols fit in the card (four 44px targets and the gaps are about 200px).

5. **§2.2 says the worked answer twice, and then says the parabola was computed.** The worked paragraph gives \(u = 1 - v^2/4\) for \(x = 1\). The card directly under it says “The line \(x = 1\) was \(u = 1 - v^2/4\).” The next card opens with “Another vertical line under z^2. The parabola is computed.” Change: the \(x = 2\) card asks for the image and leaves the line just worked in the paragraph above. The generator prompt ends at “Another vertical line under \(z^2\).”

6. **The mark is 5.4px on the phone, and the frame cuts it at the edge.** Each square is 158×158 at 390, and the green circle is radius 11 in a 320 viewBox, which draws at 5.4px. At 1280 it is 9.2px in a 268px square. Dragging §2.4 to the left edge put the centre 2px inside the border with that 5.4px radius, so the mark crosses the frame. The claim on that still was “On the negative real axis, Arg jumps.” The outline stayed none. Change: paint the green mark and the purple mark at about 14px on the phone. The 44px hit stays. Clamp the centre in by that radius so the whole mark stays inside the square.

### Keep

The paper, the serif title, and the four teaching colours. The header is the name, the theme button, and the menu, and it stays quiet in both themes. The lede is the colour key, one time, and the captions under the squares say “z plane” and “w plane.” The uppercase kickers (The Book, Worked, Practice, Further reading) stay. They are the book path. Show the back stays the card’s own full-width button, and the back stays closed until asked. Stage complete stays 44px and stays disabled until the claim has been both true and false. The 544px cap on the pair stays, so the claim can end at y = 718 inside the 800px window. A drag leaves the square unframed. Memory stays hidden until the card is finished. The status line, “0 of 5 stages marked.”, sits under the five stages.

## Chapter 2, batch 3

Started from `3467fc0`. Items 1–13.

On the book, at 390, Open Chapter 2 is the first control, 44px, from y = 265 to 309. A stored stage mark changes the status to “Chapter 2: 2 of 5 stages marked.” The green and purple marks draw at 13.8px on the phone, the hit stays 44px, and the §2.4 mark stops at the left edge of the square. The Summit heading stays hidden with its sentence. Another on the parabola moves from \(x = 4\) to \(x = 5\), and neither generator offers \(x = 1\) or \(x = 2\). §2.5 works \(x = 1\) as \(|w-1/2|=1/2\). The \(x = 2\) card asks for the image and does not reprint \(u = 1 - v^2/4\). The claim says “On the blue line or to its right.” The four root choices sit in one row, each 44px. A closed Memory sheet button holds the page cites. The roots item’s miss names the dropped \(2\pi k\).

Claim ends at y = 694 at 390 and y = 718 at 1280 in the dark. No sideways scroll. No console errors. The three checks passed.

## skeptical-student (Ch2 batch 3)

I have not had complex analysis. I was on a phone, and I was tired. Preview https://ch2-preview.complexanalysis.pages.dev, branch `cursor/chapter-2`, tip `52997b5`. Headless Chrome, a touch, 390×844 first, then 1280×800, light and dark. Fresh storage, then one stage marked. No product code changed. No console errors. No sideways scroll: `scrollWidth` was 390 and 1280.

### Verdict

ANOTHER BATCH. I can drag the green speck and watch the purple one move, and the sentence does flip. I still cannot say what a linear map did, what a limit is, or what a branch cut is. The book tells me to walk Chapter 4. One picture tells me I missed the line I am standing under. Fix those. Do not add a sixth stage.

### Where I got lost

The preview opened on Test 1. The first screen is WHICH TEST, The Map, and "Drag the dot, read the four lines, then find your problem on the map." No chapter, no book. The dot is not on that screen. I went to the book.

The book, 390×844, light. Open Chapter 2 is the first control, 324×44, at y = 265. Under it the status is a 324×256 blank slab. The only sentence in the slab is "Next is §4.1, Exercise 3. 0 of 8 exercises." Walk Chapter 4 is the button at the bottom of the blank. Chapter 2's own card, flagged OPEN, starts at y = 849, under the fold. At 1280×800 the same card is one row: Open Chapter 2, that §4.1 sentence, Walk Chapter 4. The Chapter 2 section links are on that laptop screen. The sidebar also lists chapters 8 through 11.

Chapter 2, first screen, 390, light and dark. The lede is "Five stages. Drag the green point. Purple is where it lands. Blue is the line or circle you test, and orange is the curve it maps to." Then 2.1, "Multiplication by i is a quarter turn, and adding i slides the plane up by 1," then both squares, then "On the blue line or to its right, w = iz+i lands on or above Im w = 2." The claim ends at y = 693. Memory sheet sits at y = 694, and WORKED starts at y = 754, so the first screen ends in the worked paragraph. At 1280 the squares are 268px, the claim ends at y = 718, inside the 800px window, in the light and in the dark. Dark paper is rgb(13, 18, 28). The claim is rgb(233, 237, 245). The shades and the four colours read in both themes.

The quarter turn is a small orange arc at the origin. The thing I can check is the shade: right of the blue line, the purple point is on or above the orange line. I dragged the corner of the square. The point stayed at re = 1.6, im = 0.3. The green circle is 13.7px across in a 158px square (23.3px at 1280). Dragging the speck itself moved it to re = −0.62 and the sentence became "Left of the blue line, w = iz+i lands below Im w = 2." The purple point dropped below the orange line. That part I understood. The worked paragraph then says "Here |i| = 1, so this picture does not stretch." I had not been looking for a stretch.

Memory sheet. I tapped it. The button went grey. The new line, "Apply Az+B to each vertex. Page 54.", is at y = 2243. Nothing on the screen I was looking at changed.

Practice. Exercise 13 asks where (2+i)z − 2i sends −2+2i. The picture I had just dragged was w = iz+i. I typed hello. The page said "A number written like 3+2i." The next card is a third map, w = (2+2i)z + (1−i). Then a flash card, "What is a complex function, and what are the image, the domain, and the range?", 1 of 9. Show the back stayed closed until I asked. The back is a real sentence, and under it "One z, one w." Stage complete, under that card, is a full-width grey button. After the drag both ways it was still dead, and it does not say why. The summit stayed hidden. "0 of 5 stages marked." is at y = 10598. The page is 10,840px. Stage 2.1 is 2,053px. Stage 2.2 is 2,631px, and 1,751px of that is practice.

2.2. The why matches the drag: a vertical line, a parabola. Off the line, "w = z² has left the orange curve." On the line, it sits on the curve. The worked paragraph is the algebra for x = 1. The card under it asks for x = 2. I picked u = 4 − v²/4. The button went red, the other three stayed open, and the line was "v^2/4 belongs to the line x = 1." Another moved the generated line from x = 4 to x = 5. Then a card about a sector under z³. The picture has no sector. I do not know what arg means.

2.3. "The conjugate mirrors the point, and that limit exists." Both dots sit in the upper part of a circle. The sentence is "Here δ = ε." I do not know δ, ε, or a conjugate. Dragging onto the centre dot says "Definition 2.4 skips z₀. Move off it." Dragging out says "The image is outside that disk." That last one I could see.

2.4. The dot starts above the dashed line, and the sentence says the square root is in the upper half-plane. A short drag, to im = −0.19, flipped it: "Below the cut, Arg z is near −π, and the principal square root is in the lower half-plane." The purple point dropped below the axis. A longer drag, the one I actually made the first time, landed at im = −1.38, still under the dashed line, in the lower half of the square. The sentence became "Off the cut, Arg does not jump. Cross the blue ray." I had crossed it. The four choices −i, i, 1, −1 sit in one row, each 51×44. Tapping i said "i is the limit from above the cut" and left the others open. Tapping −i explained the half-angle and enabled Stage complete. The summit, "Arg jumps across the negative real axis, and the principal square root jumps with it. Next is 2.5.", was in the page at that moment and not on the screen I was looking at. Marked. The status became "1 of 5 stages marked."

2.5 is the one I could say back. "1/z sends the line x = 1 to a circle." On the line, the purple point sits on the orange circle. Off the line, it leaves, faded. At 0 the purple point vanishes and the sentence says 1/z is not a point of the plane. The worked paragraph is the algebra u = 1/(1+y²). I did not compute it. The picture was enough.

The Book, at the top of the chapter, is 69×17. Back to the book, at the bottom, is 23px tall. After the mark, the book status does say "Chapter 2: 1 of 5 stages marked." The slab is still 256px tall. Walk Chapter 4 is still the other button. The Done on 2.4 is on the chapter card, under the fold. The menu button and the theme button are 44px.

### Ranked

1. **The book's sentence has to be the button I am about to press, and the slab has to shrink to that sentence.** Evidence: at 390 the status under Open Chapter 2 is 324×256, and the only words are "Next is §4.1, Exercise 3. 0 of 8 exercises." Walk Chapter 4 is the other button. Chapter 2 starts at y = 849. At 1280 the same three things are one row. After I marked 2.4 the sentence became "Chapter 2: 1 of 5 stages marked." and the slab was still 256px, with Walk Chapter 4 still in it. Change: the sentence is "Next is §2.1." One button, Open Chapter 2. Walk Chapter 4 moves onto the Chapter 4 card. The status is one line. `flex: 1 1 16rem` on `.book-status` is the blank.

2. **Memory sheet has to open where my thumb is.** Evidence: the button is on the first screen, y = 694, 156×44, between the claim and Worked. After the tap the button greys and the line "Apply Az+B to each vertex. Page 54." is at y = 2243. The same button sits in that spot on 2.2, 2.3, 2.4, and 2.5. Change: delete the button. Print that one line under the claim, already open.

3. **Below the dashed line is below the cut.** Evidence: a 28px drag to im = −0.19 showed the lower half-plane sentence, and the purple point dropped. The drag I made first landed at im = −1.38, the dot still in the lower half of the square, under the dashed line. The sentence was "Off the cut, Arg does not jump. Cross the blue ray." Tapping −i then enabled Stage complete, so the stage can be marked on the "does not jump" sentence. Change: the whole lower half says the square root is in the lower half-plane. The whole upper half says the upper half-plane. "Cross the blue ray" is only for a dot that is still on the right of the origin. Stage complete waits for those two sentences.

4. **The line above the picture has to be the sentence the drag checks.** Evidence: 2.1 says a quarter turn. The picture is a shaded half and a small arc, and the sentence that flips is the line Im w = 2. The worked line says the picture does not stretch. 2.3 says the conjugate mirrors the point, and the claim says δ = ε. Dragging onto the centre says "Definition 2.4 skips z₀." 2.2's picture is a parabola, and a later card asks where a sector goes under z³. Exercise 13 is w = (2+i)z − 2i, a different map from the planes above it. Change: 2.1's line is "Right of the blue line, the purple point sits on or above the orange line." 2.3's line is "Inside the blue circle, the purple point is inside the orange circle." δ, the conjugate, and Definition 2.4 stay in the worked paragraph. The sector card leaves this page until a picture shows a sector. The first blank is an image under the map on the screen.

5. **Tell me what the grey button is waiting for, and put "0 of 5" at the top.** Evidence: after the 2.1 drag both ways, Stage complete stayed disabled and the label stayed "Stage complete", with no description. The summit stayed hidden. "0 of 5 stages marked." is at y = 10598 on a 10,840px page. 2.1's practice is 919px: Exercise 13, a generated map, and card 1 of 9. The summit I earned on 2.4 was below the screen I was looking at. Change: "0 of 5" sits under the title, with a link for each stage. The disabled button reads "Answer one card to finish 2.1." One practice card on the stage, the one about the picture. The rest wait behind Another. When the stage is earned, scroll the summit up under the picture.

6. **A press anywhere in the z square moves the point, and the point is big enough to see.** Evidence: at 390 the green circle is 13.7×13.7 inside a 158×158 square. A drag from 8px inside the corner left re = 1.6, im = 0.3. A drag on the speck flipped the claim. At 1280 the speck is 23.3px and the corner still does nothing. Change: finger down anywhere in the z square puts the green point there. Paint the point about 22px on the phone.

### What to keep

The drag, once it hits, is the lesson. Left of the blue line, the purple point drops below the orange line. Off the line, it leaves the parabola. Inside the circle, outside the circle, and on the centre the page tells me to move. On x = 1 the purple point sits on the orange circle. At 0 it vanishes, and the sentence says 1/z is not a point of the plane. I saw that in the light and in the dark. The claim is on the first screen at both sizes: it ends at y = 693 on the phone and y = 718 on the laptop. The lede's four colours are the colours on the squares. Open Chapter 2 is a real 44px button, and after a mark the book does say "Chapter 2: 1 of 5 stages marked." A wrong parabola choice names the line x = 1 and leaves the other choices open. Another goes from x = 4 to x = 5. hello gets "A number written like 3+2i." The i on the branch card says "i is the limit from above the cut." Show the back stays closed until I ask, and "One z, one w." is the line I would remember. The four root buttons are one row, each 44px tall, and they fit. The theme button and the menu are 44px. Nothing scrolls sideways. The console stays quiet.

## reviewer (Ch2 batch 3)

Reviewed `52997b5` on `cursor/chapter-2` against Howell & Mathews, *Complex Analysis*, 202 Updated Edition (the attached PDF; printed page n is PDF page n+9). Preview https://ch2-preview.complexanalysis.pages.dev was that tip. Not merged. No deploy.

### Verdict

ACCEPT WITH FIXES

The five pictures and the static answers match the book. Two memory lines cited the wrong page, and the roots card marked two of its four choices right. Those are fixed on this branch. The tip after the fixes is in the commit that adds this section.

### What matches the book

Checked every claim in `js/stations/chapter2.js`, `js/stations/ch2-picture.js`, and `data/practice/ch2.json`, and recomputed the generators for seeds 1–80.

- §2.1, page 43: a function sends each z in D to one w. Image, into, inverse image, and one-to-one are page 46. Translation is page 48. Rotation and magnification are named on page 49. The linear map w = Az + B is page 50.
- Example 2.9, pages 50–51. w = iz + i. Re z ≥ 1 maps onto Im w ≥ 2, because v = x + 1. The picture’s true sentence is that half-plane, boundary included. Left of the line, v is strictly below 2.
- Exercise 13, page 54. w = (2+i)z − 2i. The vertices −2+i, −2+2i, and 2+i go to −5−2i, −6, and 3+2i. The domain triangle is right-angled, and a linear map keeps the angle, so “right triangle” is a true accept.
- Definition 2.1, page 55, with −π < Arg ≤ π as on page 56. Example 2.12, page 56: x = a ≠ 0 goes to u = a² − y², v = 2ay, and Equation (2.10) is u = a² − v²/(4a²). Exercise 1(b), page 59, is x = 2, so u = 4 − v²/16. Page 58: w = zⁿ multiplies arguments by n. Definition 2.2, page 59, is the principal nth root only.
- Definition 2.3, page 61. Definition 2.4, Example 2.16, and the statement of Theorem 2.1 are page 62. The proof, including |u−u₀| ≤ |f(z)−w₀|, the minimum of δ₁ and δ₂, and the two halves adding to ε, is page 63. The conjugate keeps distance, so δ = ε. The book’s solution says “y axis”; conjugation reflects in the real axis, and the picture does that. Theorems 2.2 and 2.3 and Definitions 2.5 and 2.6 are page 64. Theorem 2.4 starts on page 64; the composition bullet, which needs f continuous in a neighborhood of g(z₀), is page 65. The card states that neighborhood. Exercise 1(a), page 66, is lim (z→2+i) (z² − 4z + 2 + 5i) = −3+5i. (2+i)² = 3+4i.
- Example 2.21, pages 68–69. At a negative real number the limit from above is i√r₀ and from below is −i√r₀. Near −1, the lower choice −i is the book’s limit. A branch, page 68, is one continuous single-valued choice.
- §2.5 opens on page 72. Figure 2.22, the sphere and the north pole, is page 73. Equation (2.32), page 74, sends 0 to ∞. Example 2.24, page 76: the line x = a ≠ 0 goes to the circle with centre 1/(2a) and radius |1/(2a)|. The picture’s x = 1 circle is |w − 1/2| = 1/2. The card’s x = 2 circle is |w − 1/4| = 1/4.
- Equation (1.45), page 32, is the full set of nth roots: modulus to the 1/n, argument (Arg + 2πk)/n, k = 0,…,n−1. The roots card was citing Definition 2.2 for that formula.

Generator arithmetic, recomputed rather than read off the string: each linear image is (a+bi)(x+yi)+(c+di); each vertical line satisfies Equation (2.10); each reciprocal sample sits on the circle of radius |1/(2a)|; each listed root powers back to the number. `0-6i` is still rejected for −6. `2i+3`, `-6.0`, and `(3+2i)` still count. `js/core/map-route.js` matches `kit/template/js/core/map-route.js`. Live code does not import `kit/`. `node tools/check_vectors.mjs` (234/234), `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` passed. The roots card was graded in headless Chrome on this tree: the title is Equation (1.45), page 32; “i and −i” on the square roots of 1 says those are the square roots of −1 and stays a wrong choice; “1 and −1” locks. No console errors on that load.

### Fixes pushed to cursor/chapter-2

- The roots card listed the roots in both orders and accepted both, so two of the four buttons were right. One order is the answer. Each other button names the dropped roots (k = 0 only, the square roots of 1, or the square roots of −1). The cite is Equation (1.45), page 32, not Definition 2.2.
- The §2.2 sheet cited page 59 for Equation (2.10). That equation is on page 56. The sheet now says u = a² − y², v = 2ay, and u = a² − v²/(4a²), page 56. The nth-root line cites Equation (1.45), page 32.
- The §2.5 sheet cited page 72 for the circle and wrote radius 1/(2a) with no absolute value. Example 2.24, page 76, uses |1/(2a)|. The lines-and-circles flash why now says page 76, which is where that sentence is. The section still opens on page 72, and that pin stays on Further reading.

### Leftovers not fixed

1. **Below the cut, but not near it, the §2.4 sentence says to cross the ray.** At about −1.1 − 1.38i, Arg is about −2.24, which is not near −π, and the principal square root is still in the lower half-plane. The claim says “Off the cut, Arg does not jump. Cross the blue ray.” The jump is only beside the cut: the code asks for an argument within 0.55 of ±π, which is what Example 2.21 computes. That restriction should stay. Widening “near −π” to the whole lower half-plane would be false. The miss is the instruction. A point with negative real part and negative imaginary part is already on the lower side. At z = 0 the same fallback says Arg does not jump, and page 69 calls the origin the branch point.
2. **At 0, the §2.5 sentence does not name ∞.** “At 0, 1/z is not a point of the plane” is true of the finite plane, and the purple dot is hidden. Equation (2.32) on page 74 sends that point to ∞, the north pole of Figure 2.22. The worked line does not say so.
3. **A finished card appends a second memory line.** The sheet line carries the page. The earned `memory` string does not, so it is added again without the page. Neither line is false.
4. **Another on the roots card repeats three numbers.** Seeds cycle the square roots of 1, the fourth roots of 1, and the square roots of −1. Each list satisfies Equation (1.45). The fourth press reprints the first. A modulus other than 1 is not in the pool.

## ux-veteran (Ch2 batch 3)

Preview https://ch2-preview.complexanalysis.pages.dev, branch `cursor/chapter-2`, tip `52997b5`. The live `chapter2.js` lede matched that commit. Walked as a student in headless Chrome with a touch: home, the drawer, the book, then Chapter 2 through all five stages. 390×844 first, then 1280×800, light then dark. No product code changed. No console errors. No sideways scroll: `scrollWidth` was 390 and 1280 on the home, the book, and Chapter 2, in both themes. `cee2b0d` and `2cd1380` landed after the walk. They correct two sheet cites and the roots card. The door, the handoff, the grey button, the memory list, the colour key, and the ray sentence are the ones measured below.

### Verdict

ANOTHER BATCH

The chapter opens on the picture. At 390×844 the two planes sit at y = 448 and the claim ends at y = 694, in the light and in the dark. At 1280×800 the planes are 268px, the pair is 544px, and the claim ends at y = 718, again in both themes. Dragging the green point flips that sentence on §2.1, §2.2, §2.3, and §2.5, and the purple point follows. The type is the site's type. The climb around the picture still loses a student in three places: the book card names a different chapter than its button, the link to the next stage throws away the stage just earned, and Stage complete sits grey with no reason.

### How the walk went

Home, 390, light, fresh storage. The first screen is Test 1: Which test, The Map, the four thread pills, and two buttons. The word chapter is absent. The drawer opens from a 44×44 Places button. Its first row is The Book, 44px. The rows under it are the Test 1 places, including Linear Maps and zⁿ. At 1280 the hamburger is gone and that same Book row is the top of the sidebar, at y = 72.

The book, 390, both themes. Open Chapter 2 is the first control, 324×44, from y = 265 to 309, fill `rgb(47, 62, 92)` in the light and `rgb(207, 216, 234)` in the dark. The line under it says "Next is §4.1, Exercise 3. 0 of 8 exercises." That line's box is 256px tall, so Walk Chapter 4, also 44px, starts at y = 581. The card is one button, one sentence, a hole, and a second button. Chapter 1, flagged LATER, is the first chapter on the screen. The Chapter 2 card starts at y = 849, five pixels under an 844px window. Its five section rows are links, and they are 26px tall (the §2.5 row wraps to 53). The chapter titles are not links. At 1280 the hole is gone: the status is 26px and the two buttons share y = 233. The sentence still names §4.1 beside a button that opens Chapter 2.

Chapter 2, first screen, both sizes, both themes. THE BOOK, the Iowan title, the lede "Five stages. Drag the green point. Purple is where it lands. Blue is the line or circle you test, and orange is the curve it maps to.", the source line, then §2.1. The why is the quarter turn and the slide. Both squares are on the screen, shaded, with a 17×17 orange arc on the phone. The claim is "On the blue line or to its right, w = iz+i lands on or above Im w = 2." The green mark draws at 13.7px on the phone and 23.3px at 1280. A press 20px from its centre moves it. A press on the corner of the square leaves it at re = 1.6. A press 50px from the centre, still inside the square, leaves it there. Dragging to the left edge flips the claim to "lands below Im w = 2", and the mark stays inside the square (11.9px of inset). Dragging back flips it the other way. Memory sheet, 156×44, sits in that gap, and WORKED starts under it.

Stage complete, on arrival, is disabled at y = 1878. The Summit heading is hidden with its sentence. After the claim had been true and then false, the button was still disabled and the summit was still hidden. Exercise 13 then took `-6`, `3+2i`, and `triangle`. A wrong try, `hello`, said "A number written like 3+2i." The Check button is 85×44 and the blank is 44px tall. Finishing the card enabled Stage complete, showed the summit, and opened the memory list. The summit reads the quarter turn, the slide, and Re z ≥ 1, then "Next is 2.2." That link is 21×19. Tapping it landed on `#chapter-2-2-2` with the §2.2 title at y = 96, under a header that ends at y = 56. Coming back to `#chapter-2`, Stage complete was disabled again, the summit was hidden, and `mv:progress.ch2` was unset. Redoing the drag and the card enabled the button. Pressing it set the label to Marked and the status to "1 of 5 stages marked." That status lives at y = 10475 on a page 11043px tall.

The memory list that opened is two bullets: "Apply Az+B to each vertex. Page 54." and "Apply Az+B to each vertex." It sits at y = 2453. The button that owns it is at y = 694. Opening the sheet does not bring the list onto the screen.

§2.2 opens on the line, and the claim says the image sits on the orange curve. Dragging off the line flips it. The four choices for x = 2 are stacked, each 44px tall, set in the same math as the paragraph. §2.3 opens inside the disk, "Here δ = ε", and dragging out flips it to outside the disk. §2.5 opens on the circle, and dragging off the line flips it; the purple mark drops to opacity 0.45 once it leaves the window. §2.4 opens above the cut, with the square root in the upper half-plane. Dragging to the lower left, re = −1.94 and im = −1.44, puts the mark below the dashed ray and inside the square. The claim says "Off the cut, Arg does not jump. Cross the blue ray."

The four root choices are one row, each 51×44, at both widths and in both themes. Further reading links are 23px tall, or 49px when they wrap, and each opens the textbook in a new tab. They sit between Stage complete and the next stage.

THE BOOK at the top of the chapter is 69×17, on Chapter 2 and on Chapter 4. Back to the book, at the bottom, is 23px tall. From the book scrolled to 900, opening the chapter, scrolling to 1400, and pressing Back returned to `#book` at scroll 0. Forward returned to `#chapter-2` at scroll 0. After the mark, the kicker does land on the book, and the status there reads "Chapter 2: 1 of 5 stages marked." A deep link to `#chapter-2-2-4` puts the flag at y = 73 and the title at y = 96. The header ends at 56, so the title is clear of it. Back from that kicker returned to the section, title still at y = 96.

The footer key, opened on Chapter 2 at both sizes, shows `#colour-key-test1`. Its first line is "Blue is the Cartesian address." Its second is "Orange is the polar address." The circuit, Test 2, Julia, and Newton lists are in the footer and hidden. The wide sidebar highlights "2 Complex Functions". It also still lists Residue Theory through the Laplace transform.

The chapter uses the station type. At 390 the title is Iowan Old Style, 25.85px, weight 600, `rgb(26, 34, 48)` in the light and `rgb(233, 237, 245)` in the dark. The lede is 16.8px in the muted grey. The paper is `rgb(246, 243, 236)` and `rgb(13, 18, 28)`. A card is white in the light, radius 10px, 16px of padding. Addresses and Chapter 4 use that same title, lede, and kicker. At 1280 the chapter title is 36px and the sidebar is 280px. Nothing in the chrome asks for a new type.

### Ranked

1. **The book's first screen should name the button it is showing.** Evidence: at 390, both themes, Open Chapter 2 runs from y = 265 to 309, and the sentence in the same card is "Next is §4.1, Exercise 3. 0 of 8 exercises." That sentence's box is 256px tall (`flex: 1 1 16rem` on a column), so Walk Chapter 4 starts at y = 581 and the Chapter 2 card starts at y = 849, under the fold. At 1280 the box is 26px and the sentence still names §4.1. The five section rows are 26px tall. Change: the line reads "Chapter 2. 0 of 5 stages marked." On the phone the status is `flex: 0 1 auto`, so the Chapter 2 card sits on the 844px screen. Each §2.1–§2.5 row is 44px tall. Walk Chapter 4 stays the second button.

2. **The way to the next stage has to keep the stage.** Evidence: "Next is 2.2" is 21×19. Tapping it opened `#chapter-2-2-2`, and returning to `#chapter-2` showed Stage complete disabled, the summit hidden, and no `mv:progress.ch2` mark. Pressing Stage complete after a second pass did store the mark, and the book then said "Chapter 2: 1 of 5 stages marked." THE BOOK is 69×17. Back to the book is 23px. Browser Back from scroll 1400 returned to `#book` at scroll 0, and Forward returned to the chapter at scroll 0. Change: "Go to 2.2" is a 44px button under Stage complete, and the press writes the mark before it moves. The Book is that same 44px control at the top of the chapter. Browser Back returns to the scroll the student left.

3. **Say what Stage complete is waiting for.** Evidence: on arrival the button is disabled at y = 1878 and the Summit heading is hidden. After the claim had been both true and false, it was still disabled and the summit was still hidden. The flash deck above it reads "1 of 9." The button enabled only after Exercise 13 was finished. Change: while it is disabled, one line names the missing piece, "Drag until the sentence changes" or "Finish one practice card." When both have happened, show the Summit heading and the sentence together, and enable the button.

4. **Put the memory list under its button, once.** Evidence: Memory sheet is 156×44 at y = 694, between the claim and WORKED. Finishing Exercise 13 opened the list at y = 2453, off the phone screen, as two bullets of "Apply Az+B to each vertex," one with "Page 54" and one without. Change: the button and the list are one block after Practice, closed until asked, and opening it shows the lines under the button. One copy of each line, with its page.

5. **The colour key on this chapter is the key the pictures use.** Evidence: the lede says blue is the line or circle you test and orange is the curve it maps to. The footer key opened on Chapter 2, at 390 and at 1280, both themes, and the visible list was `#colour-key-test1`: "Blue is the Cartesian address" and "Orange is the polar address." Change: on a book chapter the key is those four words. Blue is the set you test, orange is where it lands, green is the point you drag, purple is the image. Arg, the seam, the threads, and the Test 2 lines stay off this page.

6. **A point already below the ray should not be told to cross it, and a press on the square should move the point.** Evidence: §2.4 opens with "Above the cut." Dragging to re = −1.94, im = −1.44 put the mark below the dashed ray, inside the square, and the claim said "Off the cut, Arg does not jump. Cross the blue ray." The jump stays the band beside the cut, about 0.55 from ±π, which is what Example 2.21 computes. Calling the whole half-plane "near −π" would be false. On §2.1 a press in the corner of the square, and a press 50px from the dot, left the point at re = 1.6. Change: a point on the lower side says it is on the lower side and that Arg is not yet near −π, so move toward the ray. The same for the upper side. "Cross the blue ray" is only while the point is still on the right of the origin. A press anywhere on the z plane moves the green point.

### Keep

The first screen of the chapter. Both planes, the shaded half-plane, the claim that names w = iz+i, and the four colours, at 390 and at 1280, in the light and in the dark. The drag on §2.1, §2.2, §2.3, and §2.5 flips the sentence and the purple point agrees. The green mark stays inside the square, 13.7px on the phone and 23.3px on the laptop, and a press within 20px of it moves. Open Chapter 2 is a real 44px primary button. After a mark, the book status says how many of the five stages are marked. Stage complete stays 44px and stays disabled until the claim has been both ways and one card is finished, and the Summit heading stays hidden until then. The practice blanks and the choice buttons are 44px, the formulas match the paragraph, and the four roots sit in one row at 51×44. Show the back stays closed. A deep link to §2.4 puts the title clear of the header. The sidebar at 1280 highlights Chapter 2. The paper, the Iowan title, and the lede match Addresses and Chapter 4. No sideways scroll, and the console stayed quiet.
