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
