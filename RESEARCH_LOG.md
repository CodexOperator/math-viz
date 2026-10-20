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

# Test 2 story map

Branch `cursor/test2-map-58db`, off `gh-pages`. Batch 1. The textbook is Howell & Mathews, *Complex Analysis*, the free open edition (CC BY 4.0). HTML https://complexanalysis.org/web/root-1-2-2.html. PDF https://complexanalysis.org/howell-complex-analysis-web.pdf. Confidence about 90%: the Test 1 handout’s chapters 2 and 3 line up with sections 2.1–2.5 and 3.1–3.2, and section 4.2 is titled “Julia and Mandelbrot Sets”. The repo never names a book, and Test 2’s syllabus is not confirmed. The page says so: “Scope based on Chapter 4; confirm with your syllabus.”

HTML numbering is the one on the page. Where the PDF number differs, it sits in brackets. Exercise numbers match.

**The choice.** A colour is the fate of repeating one motion. Test 1 taught the motion (a power, a slide, a derivative). Test 2 repeats it from every start. Three threads, not a second set of T1–T3: F1 a sequence has a fate, F2 square then slide (dashed, the Julia rule, including the set of c), F3 which root the walk finds. Fifteen stops, not twenty-one fractal canvases. The new stops are a short computed walk. The Julia film and the Newton picture are the two pictures, and their drawing code is unchanged. Mandelbrot exercises stay in the index, on the stop “Which c keep 0 bounded”. There is no Mandelbrot picture. Sections 4.3 and 4.4 are marked likely. Section 3.3 is marked possible. Both can be dropped.

Quotes carry the line “Howell & Mathews, Complex Analysis, … CC BY 4.0.” A block the book prints and a block labelled “Check (added)” are two reveals. The added checks were recomputed in `tools/fractal-smoke.mjs` (Example 4.2.1’s table, the modulus in Exercise 4.2.4, the radii in 4.4.6, the Laplacian in 3.3.1(b), the geometric sum in 4.3.1(b)). They are not official answers. The book’s HTML for Exercise 5 says the orbit of 0 is under \(f_2\); the orbit \(\{-2, 2, 2, \ldots\}\) is under \(z^2 - 2\). The index quotes the sentence and the added check names the subscript.

## Round 1 — a stop for each idea, with its section

**Problem.** Test 2 was two pictures and four topics. A student who had used the Test 1 map had no sequence, no orbit of 0, and no place to read Newton’s step before the colouring.

**Change.** Stops for sequences (§4.1), one repeated motion, the disk at c = 0, the orbit of 0, one Newton step, half-planes, the set of c (no picture), and, marked so they can be removed, geometric series (§4.3), power series (§4.4), and harmonic functions (§3.3). Each stop has a source tag linked to the HTML section and one control. N1 opens the Newton step, not the picture. J1 and J2 stay on the Julia film.

**Verified.** `node tools/fractal-smoke.mjs`: topic routes S1, J1, J3, N1, N2, M1, G1, H1; Test 1’s T1.1 still opens addresses. Chrome, served at `/math-viz/`: the sequence page cites §4.1 and the cycle chip changes the note; the seeds page has the definition and no canvas.

## Round 2 — the index, book and added kept apart

**Problem.** The exercises had to be quotable, and an added check must not look like a printed solution. Ticks must not land in the Test 1 progress store, which only knows the handout ids.

**Change.** Twenty-seven cards (the twenty-four from the source list, plus extras 4.4.3, 3.3.1, and 3.3.5). Filters by group A–E and by scope. “Show what the book prints” and “Show the check added for this site” are separate. Ticks use `progress.test2`. Scope chips do not reuse the group chip ids.

**Verified.** Chrome: 27 cards, no duplicate ids, the likely filter hides core cards, group A intersected with likely is empty, Exercise 1’s book text and added check open independently, and the 4.2.4 tag links to complexanalysis.org.

## Round 3 — the front page becomes the same kind of map

**Problem.** The nav already listed the new stops while the front page still said “Two pictures”.

**Change.** The Test 2 home uses the Test 1 map geometry, with parts A–H and threads F1–F3. Topics are listed with their section tags, not as bare titles. The finder searches the Chapter 4 exercises. The live example is one start, 0.45 + 0.2i, under c = 0, c = −0.75, and c = i. The four lines are the thesis, the Julia rule, Newton’s root, and the set of c stated rather than drawn. The night-before plan tells you to skip §4.3, §4.4, and §3.3 unless the syllabus includes them.

**Verified.** Chrome at 1280px: 15 map stops, three thread lines, F2 dashed, F2 focus dims the other stops, the finder opens `#problem-4-2-4`, c = i leaves and c = 0 stays. At 390px the map is the single column and the page does not scroll sideways. Test 1 home still draws 21 stops and does not list Julia.

## Round 4 — the two pictures name their section

**Problem.** The film and the Newton picture were the pages a student already knew, and neither said where in the book they sit. The book colours \(z^3 + 1\). This picture colours \(z^3 - 1\).

**Change.** A source tag on each header. Julia points at \(K_c\) after Example 4.2.8 [PDF Example 4.9]. Newton points at the colouring before Figure 4.2.5 [PDF Figure 4.3] and says the polynomials differ. No change to the film, the worker, or the Newton pad.

**Verified.** Smoke still passes the Julia film frame checks and the \(z^3 - 1\) arithmetic. Chrome: both canvases draw, both tags are present, no console errors on Test 1 home, Test 2 home, the index, a concept stop, Julia, or Newton, including under `/math-viz/` and at 390px.

# Batch 2 — the flat paper is the backbone

Branch `cursor/test2-map-58db`. The council’s station `#paper` was already on the branch, last in part H, linked from home. This batch makes the fate words the language of the Test 2 pages this PR owns, and takes the three ranked lists. `js/stations/julia.js` and `js/stations/newton.js` were not edited, because PR #3 owns them. The sentences those two pictures still need are in `REVIEW_LOG.md`.

**The choice.** The paper is the first panel under the thesis, and “Open the flat paper” is the primary button. “Start with a sequence” stays, and it is not the primary. Next order does not change into “paper first”. A student who only presses Next still walks sequences, the pictures, and the radius, then the index, and one further Next opens the paper. Section 3.3 is off that path. The map stays the page. Putting the paper before sequences would hide the syllabus behind a synthesis the night-before plan has not earned yet. Leaving it as a muted note under the buttons would leave it a side room, which is what the council’s prototype was and what this batch was asked to leave behind.

The colour rule is one rule. Settles and stays share blue; the word splits them. Leaves is orange. Orange on a pin is that root. Purple is the third root only. Green is the plant. c is a hollow square in the ink of the page. The Julia picture’s orange handle is named inside the orange line of the key, so the key stays four lines and there is no fifth colour. The thread bars were not repainted.

Every concept and every problem still carries its Howell & Mathews pin: chapter, section, and the exercise number on a card, linked to the HTML section, with the PDF number in brackets where the editions differ.

## What changed

Section 3.3 keeps its stop, its Possible mark, and Exercises 3.3.1 and 3.3.5. Its order is 16, after the paper, so the map does not draw a Laplacian between the radius and the index. Next from the radius is the index. Next from the index is the paper. The paper has no Next. Harmonic links the index and the paper and has no Next.

The seeds stop leads with which c keep the orbit of 0 bounded. “This site does not draw that set” is the second sentence. The nine exercise dots were left on that stop.

“The same story” panels stay. A chip for the flat paper was added in front of them on the stops the paper covers. Harmonic did not get one.

The colour-key lines that named blue and purple a second time were already gone. The four lines that remain now say the council’s rule. The shorter book blocks, the `#problem-` router, and a second F1 link that would copy previous or next were left as the close pass asked.

## Verified

`node tools/fractal-smoke.mjs` exits 0, including the new Next-path checks. Headless Chrome, served at `http://127.0.0.1:8765/math-viz/`. Test 1 home has 21 stops and no paper. After the menu switch, Test 2 puts the paper panel before the walk, the primary button opens `#paper`, c = 0 settles, c = −0.75 stays, and c = i leaves. The notch is an unfilled square. The paper panel cites Definition 4.1.1 [PDF 4.1], Example 4.2.1 [PDF 4.7], and Theorem 4.3.1 [PDF 4.12]. The colour key is four lines. Seeds’ lede starts with the bounded orbit. The radius’s Next is the index, and the same-story panel still names Disks. The index’s Next is the paper. Harmonic has no Next. Switching back restores Test 1. At 390px the home is one column, and the home, the paper, and the index do not scroll sideways (`scrollWidth` 390). No console errors.
