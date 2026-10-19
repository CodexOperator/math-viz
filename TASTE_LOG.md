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
