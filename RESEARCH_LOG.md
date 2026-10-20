# Research log

Branch `cursor/test2-fractals-2891`, off `gh-pages`. Batch 1 only: a Test 2 map with a Julia station and a Newton station. No Mandelbrot.

The two maps share one route table. Each station has a `map` (`test1`, `test2`, or `shared` for home). The nav and the home page list `stationsForMap`. A direct link such as `#julia` or `#topic-J1` switches the remembered map. Test 1 stations are unchanged and are not listed on Test 2.

## Round 1 — Choose Test 1 or Test 2, and pick a topic

**Problem.** The site was one Story Map. A second course bolted onto the same list would put fractal stations on the Test 1 map.

**Change.** Home and the place menu gained a "Which test" switch. The choice is stored under `mv:map`. Test 1 home keeps its finder, dot, spine, map and plan, and adds the twelve Test 1 topics as links. Test 2 home is a short map: four topics (J1, J2, N1, N2) and the two new places.

**Verified.** `node tools/fractal-smoke.mjs` (Test 1 still has the addresses route and not Julia; topic T1.1 still opens addresses; Test 2 is home, Julia, Newton). Headless Chrome: Test 1 map has 21 stops and no Julia node; Test 1 topics are the twelve syllabus chips; switching shows the four Test 2 topics and nav `home, julia, newton`; reload stays on Test 2; the footer sentence changes with the map.

## Round 2 — Julia set, live in c

**Problem.** A student needs to see that the rule "square, then add c" paints every starting point, and that changing the slide c changes the solid region.

**Change.** Station `#julia`. The plane shows the filled Julia set. Orange point c is dragged on a small plane (or typed, or chosen from c = 0, c = −0.75, the rabbit, c = i). A green point is one walk. Sliders set how many steps count as "stayed" and the escape radius. The dashed circle is the radius actually used (`max(slider, |c|, 2)`).

**Verified.** Smoke: origin stays inside for c = 0; 1.5 escapes; the point 0.4 + 0.2i stays at c = 0 and escapes once c moves. Chrome: at c = 0 the readout says the green walk is still inside, and the canvas is an opaque picture (mean alpha 255). Dragging the c handle to about 0.69 + 0.46i changed the canvas colour average by 56. The rabbit preset writes c = −0.123 + 0.745i. A 390px-wide window does not scroll sideways.

## Round 3 — Newton basins, live in the roots

**Problem.** The picture should be "which root does this guess find?", and dragging a root should move its colour.

**Change.** Station `#newton`. Default polynomial is z³ − 1, roots coloured blue, orange, purple. Drag a root and the basins are redrawn; the product p(z) = (z − r1)(z − r2)(z − r3) updates with them. The green point is one guess, and its Newton steps are drawn on top. Two roots gives z² − 1. A scattered three-root preset is there so the picture is not only the symmetric one.

**Verified.** Smoke: the cube roots expand to z³ − 1; a start near 1 is the blue root; moving that root onto 0 changes the colour of the start at 0; the sample guess 0.35 + 0.45i reaches a root. Chrome: the readout starts at `expanded: z^3 - 1` and "reaches the purple root (r3) in 5 steps". Dragging r1 to about 0.39 − 0.39i drops the z³ − 1 line and shifts the canvas colour average by 27.

## Round 4 — Same page, both tests, no console errors

**Problem.** The new map had to leave Test 1 working, including the next-link from home and a phone-width Julia page.

**Change.** Test 1 neighbour links use the filtered Test 1 list. Fractal pictures render at up to 560 samples on a side (about 10–20 ms here), so a drag stays sharp instead of flashing a coarse draft. Reduced motion skips that coarse pass anyway.

**Verified.** Smoke: next place after home is still addresses, on the filtered list and on the full manifest. Chrome: `#addresses` loads with `data-map="test1"`. No page errors and no console errors across home, Julia, Newton and addresses. Screenshots: Test 1 home with the switch and topic chips; Test 2 home; Julia at c = 0 and after a drag; Newton for z³ − 1 and after r1 moved; Julia at 390px wide.

## Batch 2 — cut the furniture

Started from the reviewer commit `f104e9e` (false black basins, rabbit chip, hash map, `home-which`). Four cuts. No Mandelbrot, no new presets, no quiz, no finer picture.

## Round 1 — One door per picture

**Problem.** Test 2 home said the same thing three times: a topic row, a list of the two places, and a three-line plan. An F1 badge sat on the page and as a dot in the menu.

**Change.** The page keeps the switch, the lede, and two stops. The plan’s first line is the Julia stop; the other two lines are the Newton stop. The topic row, the second list, the start button, and the F1 badge are gone. The menu no longer draws an F1 dot. `#topic-J1` still opens Julia, with no callout.

**Verified.** Headless Chrome: Test 2 home has exactly two articles and two links (`#julia`, `#newton`), no topic chips, no plan panel, no badge, and no thread dots in the menu. The stop text includes “drag c until the disk” and “drag a root”. `#topic-J1` opens Julia with no topic note. Test 1 home still has its twelve topic chips and 21 menu stops.

## Round 2 — Julia is one picture

**Problem.** Julia put a full second plane beside the set, plus an escape-radius slider, a step slider, and a rabbit chip.

**Change.** The set is the picture. c is an orange drag handle on a small pad (from −1.6 to 1.6), with the two typed parts and three chips: c = 0, c = −0.75, c = i. The rabbit chip and both sliders are gone. Arrow keys still move the handle (Shift is ten steps).

**Verified.** Chrome: no `#julia-param`, no rabbit button, no escape or step slider. At c = 0 the disk chip is pressed and the green walk is still inside. Dragging the handle off 0 changes the readout and the canvas colour average. c = −0.75 and c = i stay pressed on the value they claim. Typing the real part updates c and keeps the imaginary part. Shift+Left twice from 0 yields c = −0.2. A 390px-wide window does not scroll sideways.

## Round 3 — Newton says the polynomial out loud

**Problem.** The formula opened as a product with 0.866, while z³ − 1 was only a readout line. Degree chips and a step slider repeated a choice the example chips already made, and they disagreed.

**Change.** The formula opens as z³ − 1. The chips are z³ − 1 and z² − 1. Degree chips, the step slider, and the scattered-roots chip are gone. Drag a root off those two examples and the formula becomes the product of (z − root). The green walk stays.

**Verified.** Chrome: the formula text is z³ − 1, the unity chip is pressed, and the guess still reaches the purple root. No degree chip, no slider, no scatter chip. Dragging the blue root drops z³ − 1, clears both chips, and changes the canvas. The z² − 1 chip writes that polynomial and hides the third root.

## Round 4 — Colour key matches the page

**Problem.** On Test 2 the footer still named Arg, the seam, the time ramp, and T1–T3, and each station repeated a longer key of its own.

**Change.** Test 2’s footer names blue (stayed, or the blue root), orange (escaped, or the orange root), purple (the third Newton root), and green (the point you drag). The Test 1 key stays in the page and is shown only on Test 1. The long in-page keys are gone.

**Verified.** Chrome, colour key opened: on Julia and Newton the four lines above are the whole key, with no Arg, seam, time ramp, or T1. On `#addresses` the Test 1 key is back (Arg z and the seam) and the Test 2 list is hidden. No page errors and no console errors on those pages. `node tools/fractal-smoke.mjs` still exits 0.

## Julia film — the path of c

Branch `cursor/julia-c-animation-2891`, off `gh-pages` at `02a6411`. One picture. No Mandelbrot, no new sliders.

During a drag the fractal stays on the frame from when the pointer went down. The handle and the readout follow c. A live render on every move would race the film and do the same work twice. Letting go is what plays the path. A chip, a typed number, or an arrow key still jumps: those name a value, they are not a path the student traced, and a straight line between them would be a path we invented.

## Round 1 — Let go, and the picture plays the path

**Problem.** Dragging c changed the set immediately, one c at a time. There was no way to watch the set travel along the path the hand actually took.

**Change.** The orange handle records the polyline. On release, `samplePath` spaces up to 8 frames along that polyline, including the corner of an L, and the picture plays them in order. A twitch shorter than 0.04 is still one picture.

**Verified.** `node tools/fractal-smoke.mjs`: a straight sample stays on the line and is spaced; an L keeps a point near the corner and is not the diagonal; a short move is one point; the count caps at 8. Chrome: an L drag produced `(0,0) (0.38,0) (0.75,0) (1.13,0) (1.47,−0.03) (1.47,−0.41) (1.47,−0.78) (1.47,−1.16)`. While the button was down the fractal generation did not change. After release the frames played 0, 1, 2, … in order, and a later frame changed the canvas.

## Round 2 — “animation loading”, off the page thread

**Problem.** Eight Julia frames on the page thread would freeze the graph, and the student would not see that the film was coming.

**Change.** The graph says “animation loading” in the same turn as the release, before any frame is drawn. Frames render in `julia-anim-worker.js` at most 220 samples on a side. If the worker cannot start, the page renders one frame per turn instead. Reduced motion does not use the film: the picture keeps updating live and the release is a jump.

**Verified.** Chrome: the stage’s log contains `loading` with the text “animation loading” and the status visible. Two animation frames later, while that work was in flight, a double `requestAnimationFrame` returned in 27 ms. With `prefers-reduced-motion: reduce`, the same drag left `data-anim="idle"`, hid the status, and moved c. No console errors. Newton still reached the purple root.

## Round 3 — Play again, and the grab stays put

**Problem.** The film is easy to miss, and the off-centre grab fix had to survive the new pointer handling. Chips needed an explicit choice.

**Change.** “Play again” shows after a film and replays that path. Chips still jump. A press on the handle, off centre, still does not move c; a press on the empty pad still jumps.

**Verified.** Chrome: Play again returned to frame 0 and reached `done`. The c = −0.75 chip set c at once, pressed itself, and left the phase `idle` with the loading line hidden. A press on the rim of the handle, with no move, left c at 0.

## Julia film, batch 2 — frames by distance

The reviewer’s fixes stay. A turn sharper than about 34° is a frame, including a short bend that the step would otherwise have drawn as a straight chord. A resize that does not move the centre or the width does not cancel the film. Panning does. Cancelling a worker mid-load rejects that render and does not resume over the next drag, so no later frame is drawn. The bitmap is sized back to the field after the film; that fix was already on the branch, and the pictures below match it, so it was not rewritten.

Limits. The step is how far c moves along the path between frames. The choices are 0.04, 0.08, 0.12, and 0.2, and 0.08 is the start. The sentence under the chips says “Each frame, c moves 0.08.” Minus is a smaller step. Plus is a larger one. A film stops at 48 frames. Past that the step widens, so a long scribble still runs from its start to its end; one scribble here used all 48, with a widest gap of 0.13 instead of 0.08. Each frame is at most 220 samples on the long edge, and the film shows one every 90 ms. The first frame plays as soon as it is drawn. The rest keep arriving from the worker.

During the drag the picture and the numbers stay on the c where the drag began. Only the orange point moves. The film is the first time the set moves, and the numbers must not describe a picture that is not there yet. A live preview as well as a film would show the motion twice. Reduced motion uses no film: the picture stays still while the button is down, and the release is one picture of the final c. A chip, a typed number, or an arrow key still jumps, and it clears Play again.

## Round 1 — one frame per step

**Problem.** Eight frames, however long the drag, skipped the changes that matter. A drag to 0.45 could miss the pinch at c = 1/4. A drag to i could lose the interior in one cut.

**Change.** `samplePath` places a frame every step of arc length, then pins every sharp corner onto a frame. The minus and plus buttons set that step.

**Verified.** `node tools/fractal-smoke.mjs`: a straight path lands on the step; an L and a short leg keep the corner; a bend only 0.07 long still includes the corner; a drag to 0.45 passes within 0.04 of 1/4; a longer path and a smaller step both add frames; a twitch is one point; the cap is 8 when asked for 8. Chrome, step 0.08: a drag of 0.3 made 5 frames and a drag of 1.2 made 16. The same path of length about 1 made 14 frames at 0.08 and 7 at 0.2. The drag to 0.45 was `0, 0.08, 0.16, 0.24, 0.32, 0.40, 0.45`. The L included the point `(1, 0)`.

## Round 2 — a count, and numbers that match the picture

**Problem.** “animation loading” flashed past before it could be read, and it did not say how much of the film was ready. While the button was down the readout moved and the picture did not.

**Change.** On release the graph says “animation loading, 0 of M frames”, then replaces the 0 as each frame arrives, and hides the line when the last frame is drawn. Playback starts at the first frame. The readout, the two number fields, and the picture stay on the starting c until release. The handle’s name follows the orange point.

**Verified.** Chrome, the drag of 1.2: the log shows “animation loading, 0 of 16 frames” through “15 of 16 frames”, and the count is still on screen while `data-anim` is `playing`. Mid-drag the readout was still `c = 0` and `getC()` was still 0, while the handle’s name had moved. A press on the empty pad left c at 0 until release, then jumped. With reduced motion, a drag to about 0.7 − 0.4i never set `loading` or `playing`, held c at 0 while the button was down, and finished on that end point. During a 48-frame render a double `requestAnimationFrame` returned in 17 ms. No console errors.

## Round 3 — the full picture, and Play again for this path only

**Problem.** After a film the set had looked like a magnified corner, and Play again could replay an old path after a chip. The corner fix was already in the bitmap resize. It needed a check, not another change.

**Change.** Play again is hidden when a drag starts and when a chip, a typed number, or an arrow key sets c. It shows only after the current path has finished playing. Nothing else was changed in the bitmap code.

**Verified.** Chrome: Play again was hidden through `loading` and `playing`, visible at `done`, hidden again while Play again itself ran, and hidden after the c = 0 chip, which also cleared the stored path. After the film of the drag to 0.45, an interior pixel and an exterior pixel matched a plain jump to that same c, and the window was still 4 units across, centred at 0. After c = 0 the blue share was 0.198, the same as the opening disk, and the sampled colours matched it (inside 11, 99, 173; outside 226, 208, 190). The drag to i was 14 frames. The blue share fell 0.198, 0.197, 0.194, 0.190, 0.183, 0.173, 0.160, 0.141, 0.108, 0.012, 0.011, 0.008, so the interior is still there for several frames and the last drop is its own frame. A resize while `playing` left the film `playing`. A pan moved the centre from 0 to about −0.87 and left the phase `idle`, with Play again hidden. A second drag during a long load left the phase `idle`, no frame number, and no stored frames. Newton still names the three roots. A 390px-wide window does not scroll sideways.

## Julia film, batch 3 — the release, the step, and the words

Pulled `6a12f91` first. The frame where you let go already waits one 90 ms beat before the sharp picture, and a newer gesture cancels that wait. That hold stays. This is the last batch.

## Round 1 — every sampled frame is shown, and the last one sits

**Problem.** The c where the pointer came up was a sample, and the sharp redraw used to replace it in the same turn. A coarse drag then showed the waist, or the dust, only as the still after the movie.

**Change.** None in the playback clock. The reviewer’s beat stays: the release frame is presented, held for the same 90 ms as the others, and the sharp picture of that same c follows. A pointer-down during that beat clears the timer.

**Verified.** `node tools/fractal-smoke.mjs` exits 0. Chrome: a drag from 0 to −0.75 at 0.08 showed frames 0 through 10, the last sample was −0.75, and that frame stayed 90 ms. At step 0.2 the same drag was `0, −0.2, −0.4, −0.6, −0.75`, every index was shown, the last frame stayed 90 ms, and the still afterwards was that c. The drag to 0.45 showed 0 through 6, including 0.24 and 0.45, held the release 90 ms, and a pixel of the still matched a plain jump to that c. The drag to i showed 0 through 13, the last sample was i, held 99 ms, and the blue share fell from 0.198 through 0.108 to 0.008. A press during the release beat of a later film left the phase `idle` and cleared the stored frames.

## Round 2 — the sentence and the film use one step

**Problem.** A loop of length about 5.7 played the same 48 frames at 0.04, 0.08, and 0.12. The line under the chips still named the button, so the finer steps did nothing on a long drag.

**Change.** The cap is 96 frames. That is twice the old cap, and it is the smallest rise that makes 0.04, 0.08, and 0.12 different films on a loop of this length. Past 96 the step still widens, and the line then names the step the frames actually use: “Each frame, c moves 0.06 (widened from 0.04 for this long drag).” A press of minus or plus, or the start of the next drag, puts the line back on the button. The worker is unchanged. 96 frames of a scribble is about 8.6 s of playback; a straight drag at 0.04 stays well under the cap.

**Verified.** Smoke: the square loop of side 1.425 is 96 frames at 0.04, with spacing 0.06, and fewer frames at 0.08 and at 0.12, and the 0.08 spacing stays 0.08. Chrome, the same loop: 96 frames at 0.04, 73 at 0.08, 49 at 0.12, and 30 at 0.2. The 0.04 line was the widened sentence above. The 0.08 and 0.12 lines stayed “Each frame, c moves 0.08.” and “Each frame, c moves 0.12.” During the 96-frame render the longest gap between animation frames was 16.8 ms, the same budget the reviewer measured at 48 frames.

## Round 3 — “animation loading”, then the film

**Problem.** The count ran through every integer in a tenth of a second, in a box over the middle of the set, so the words could not be read. A lit c = 0 chip beside a handle that had already moved looked like the drag had missed.

**Change.** The graph says “animation loading”, and nothing else. The words go up in the same turn as the release. The first frame is drawn as soon as it is ready; the render is not delayed. The box stays until the words have been up for 0.7 s, which is long enough to read them, and then it leaves. It sits along the top of the picture. A drag clears every chip as soon as the pointer goes down. The picture and the readout still stay on the starting c until release.

**Verified.** Chrome, the drag to −0.75: the only status text was “animation loading”. It was already showing when frame 0 was drawn, it stayed 699 ms, and the box sat 5% of the way down the picture. Mid-drag the c = 0 chip and the c = −0.75 chip were both unpressed, the readout was still `c = 0`, and `getC()` was still 0. A 390px-wide window does not scroll sideways. No console errors.

## One picture for Julia and Newton

Branch `cursor/unify-fractal-ui-fc73`, off `gh-pages`. Batch 1 of the loop. Three rounds. No Mandelbrot.

**Decision.** Both stations use Newton’s arrangement, which is also Test 1’s: the thing you change is a handle on the picture you are reading. Julia’s orange c moves onto the Julia plane, next to the green walk. The side pad is gone.

The other way, a pad for Newton’s roots, was rejected. The root has to sit in its basin. That is the lesson. A pad would put the root in a different square from the colour that belongs to it. Test 1 already works this way: on Addresses, Roots, and Arithmetic the dot you drag is the dot the picture is about. The earlier taste note said Newton was the page closer to that, and Julia was the page with a second control.

c is a parameter, not a starting point, and the z-plane is a plane of starting points. The caption and the Julia colour key say so: orange on that page is a walk that ran away, and the orange handle is the slide. It is not a second start. The range of c is the window the picture opens on, −2 to 2, rather than the old pad’s −1.6 to 1.6. The three examples still sit inside it. A click on empty canvas pans, as it does on Newton and on Test 1. The old “click the empty pad and c jumps” gesture left with the pad. The off-centre grab stays: it is the plane’s own grab offset, the same one every Test 1 handle uses. A press on the rim does not move the point.

The words sit beside the picture on a wide window, and under it on a phone, picture first. That column is the sentence, the chips, and, on Julia, the two typed parts and the step. It is not a second graph.

**Textbook.** The repo names MAT 412 and a Test 1 handout of problems. It does not name a published book, and it does not give a chapter or a section for Julia sets or Newton’s method. Both stations leave the source line empty. `js/data/textbook.js` exports `JULIA_SOURCE` and `NEWTON_SOURCE` as null. `citationText` prints a line only when book, chapter, and section are all present. The element is `#julia-source` and `#newton-source`, class `station-source`, `data-slot="textbook"`, `data-filled="false"`, hidden, so a blank “Textbook:” does not sit on the page. Filling those two exports is the whole change that makes the line appear, on both stations, from the one layout.

## Round 1 — the handle is on the picture

**Problem.** Julia kept c on a square pad beside the set. Newton put its roots on the basins. The two pages did not share a way to draw a handle, catch a pointer, lay out the readout, or lay out the chips.

**Change.** `js/core/fractal-station.js` builds the page both stations mount: picture, rule, chips, readout, and `addDragHandle`, which splits a plane drag into a move, a release, and a jump. Julia’s film still starts on the release. While the button is down the picture and the numbers stay on the old c, and only the orange point moves. The step is still 0.04, 0.08, 0.12, 0.2, the cap is still 96 frames, and the widened-step sentence is unchanged. Play again, the worker, and reduced motion are unchanged. Newton’s formula is still z³ − 1, then z² − 1, then the product.

**Verified.** `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, served as `http://127.0.0.1:8765/math-viz/`: no `#julia-c-pad`. `#julia-plane-c` and `#julia-plane-z` are on the one canvas. The c dot is `rgb(168, 67, 0)` (orange) and the walk dot is `rgb(0, 110, 83)` (green). A press on the rim of the c handle left c at 0. Mid-drag toward −0.75, `getC()` was still 0, the readout still started `c = 0`, both chips were unpressed, the phase was `idle`, and the fractal generation did not change. On release the status text was “animation loading”, the film ended at −0.75, and Play again was shown. Play again returned to `loading` and then `done`. The worker and `fractal.js` loaded from `/math-viz/js/core/`. With reduced motion the same kind of drag held c at 0 while the button was down and finished as one jump, phase `idle`. Shift+Left from −0.4 wrote c = −0.5 and hid Play again. The plus button changed the sentence to 0.12. The c = 0 chip jumped, pressed itself, and left the phase `idle`.

## Round 2 — the page is the same kind of page as Test 1

**Problem.** A handle on the picture is not enough. Test 1 stations name the thread, link to the neighbour with that thread’s prefix, and keep the picture on the screen you open. Stacking Julia’s rule, fields, and step above the canvas pushed the set to about y = 830 on a 900px window.

**Change.** The picture is the first column. The rule sits beside it from 52rem, and under it on a phone. The header carries the F1 badge, “F1 · One rule, every starting point”, the same badge Test 1 uses for T1–T3. The menu still draws no F1 dot. Julia’s links are “F1 previous: The Map” and “F1 next: Newton Fractals: Which Root?”. Newton’s are “F1 previous: Julia Sets: Square, then Slide” and “The Map”. The captions name the two kinds of dot: on Julia, green is one start and orange is the slide; on Newton, green is one guess and the coloured dots are the roots. The textbook slot is in that header, empty, as above.

**Verified.** Chrome: both badges include “F1” and “One rule”. Both source nodes are hidden with `data-filled="false"` and `data-slot="textbook"`. Julia’s two links start with “F1 previous:” and “F1 next:”. Newton’s links include “F1 previous:” and “The Map”. At 390px neither page scrolls sideways (overflow 0). The picture is on screen beside the words at 1280px. No console errors. Test 1 `#addresses` stays `data-map="test1"`, its nav has addresses and not Julia or Newton, and the next place is still in that list.

## Round 3 — the colour key is the page you are on

**Problem.** One Test 2 key described both pictures in every line. On Julia it defined purple, which is not on that page, and it called orange “escaped” while the handle you drag is that same orange.

**Change.** `body[data-station]` picks the list. Julia’s key is three lines: blue stayed, orange escaped and the orange handle is c, green is the walk. Newton’s key is the three roots and the green guess, and it says black did not settle. Test 2 home keeps the four-line pair, with the orange line now mentioning c. The Test 1 key is untouched and is the one `#addresses` shows.

**Verified.** Chrome: on `#julia` the Julia list is `display: grid` and the Newton, Test 2 home, and Test 1 lists are `display: none`. On `#newton` only the Newton list is shown. On Test 2 home only the pair list is shown. On `#addresses` only the Test 1 list is shown. Newton still opens as z³ − 1 with that chip pressed, and the guess 0.35 + 0.45i still reaches the purple root. Dragging the blue root clears both chips and drops z³ − 1. The z² − 1 chip hides `#newton-plane-r3`. `node tools/fractal-smoke.mjs` still exits 0, including the citation checks: null stays blank, a book without a chapter stays blank, and a book with a chapter and a section prints.

## Batch 2 — one sentence, then the picture

The three reviews had already filled the citations, the cards, the film line, and the Story Map click. What was left was the first look. Julia’s lede was five sentences, and it said “by c” rather than “the same c”. Newton’s lede said the colour, then explained the tangent, then explained both drags. A reader could not tell which sentence was the observation.

**Decision.** The lede is the observation and nothing else. Julia: “Square, then slide by the same c. Blue stayed near 0.” Newton: “The colour is which root the walk finds.” The tangent stays in Newton’s rule panel, where the formula already is. The drag, and “the blue region stops being a disk”, stay in Julia’s caption, under the picture the drag changes. Putting that activity back into the lede would bury the two clauses again. The home page is not edited. PR #5 rewrites that file, and it should win it. The conflict lines are in `REVIEW_LOG.md` under “Batch 2”.

The “same ink as Cartesian” clause on the footer key is skipped. The wide review locked those sentences, and the lede is now short enough to carry the observation without the key.

### Round 1 — the lede is the observation

**Change.** `js/stations/julia.js` lede and caption. `js/stations/newton.js` lede. No film change, no colour-key change, no card change.

### Round 2 — the cube-roots card opens on the three points

**Problem.** `#roots-cube` already sets c = 1 and n = 3, then opens a Test 1 page whose first words are the staircase, then “No review problem matches”, then “Three things to try”. The three points are below that. The Newton card says those points are the picture.

**Change.** Only the `cube` token scrolls to the panel “The n roots of c” after layout. On a wide window the two planes share a row, so both pictures come up and the staircase stays above them. `#roots` is not scrolled and still opens on five fifth-roots. Powers is still n = 10.

**Left alone, on purpose.** Story Map, the Map link, F1, the footer keys, the film gesture, the step line, the dashed circle (already gone), and `js/stations/home-test2.js`.

**Verified.** `node tools/fractal-smoke.mjs` exits 0, including `#roots-cube` at n = 3, c = 1, and `#roots` still at five fifth-roots. Headless Chrome, served as `http://127.0.0.1:8765/math-viz/`. Julia’s lede is exactly those two sentences. The caption is the drag, and it names the disk. Mid-drag, `getC()` stayed 0, the readout stayed `c = 0`, and the film phase stayed idle. Release said “animation loading”, and the film ended at −0.75. Newton’s lede is exactly “The colour is which root the walk finds.” The formula is still z³ − 1. The footer keys are still the locked lists, and neither page says Cartesian. `#roots-cube` scrolls so “The n roots of c” sits under the site header and “Three things to try” is above the window. `#roots` stays at the top with n = 5. At 390px Julia does not scroll sideways. Test 2 home still has the wide reviewer’s lede, because this batch did not edit that file. No console errors.
