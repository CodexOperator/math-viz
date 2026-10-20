# Review log

Batch 1 on `cursor/test2-fractals-2891`. Verdict: **accept with fixes**.

## Fixed

- The Newton picture stopped any orbit that passed `|z| = 1000`. A start such as −0.8 on `z³ − 1` does walk back to the root at 1, and the green guess already said so, but the pixel stayed black. That cutoff is gone. Smoke checks this start.
- The rabbit chip rounded `c` to two decimals (−0.12 + 0.75i) and then did not stay pressed. `c` is kept as given, and the fields show three decimals, so the chip writes −0.123 + 0.745i.
- A hash with no station forced Test 1 and overwrote `mv:map`. It now leaves the remembered map alone. `#home-t2` still forces Test 1, because that token is the Test 1 thread focus.
- The Test 1 switch used `id="home-map"`, the same id as the story-map picture. The switch is `home-which`.

## Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome: Test 1 home has 21 stops, twelve topics, the finder, and next = addresses. Addresses next is arithmetic. Test 2 nav is home, Julia, Newton. `#topic-J1` switches to Test 2. `#nope` stays on Test 2. `#home-t2` lights thread T2 on Test 1. Julia at 390px does not scroll sideways. Newton reads `z^3 - 1`, and the sample guess reaches the purple root in 5 steps. No console errors on those pages.
- Julia membership matches the single walk on a sample grid. Newton steps match `p/p'` on a 17×17 grid. A 560-pixel Newton frame is about 40 ms here, one strip about 7 ms.
- The problem index still walks the full station list. Its own previous, next, and thread links match the Test 1 list: Julia and Newton sit in the middle of the order and are not on T1–T3.
- The footer colour key still names T1–T3 only. Each Test 2 place has its own key.

## Batch 2

Verdict: **accept with fixes**.

### Fixed

- Pressing the orange c handle off-centre set c to the pointer before the drag moved. The handle is 24px on a pad of about 150px, so that jump was about a fifth of a unit and the picture changed under a grab that had not started. A press on the handle now keeps c until the pointer moves. A press on the pad itself still jumps to that point.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, no console errors: Test 2 home is the switch, the lede, and two stops (`#julia`, `#newton`). No topic chips, no plan, no start button, no F1 badge, no thread dots in the menu. `#topic-J1` opens Julia with no callout. `#nope` stays on Test 2. `#home-t2` is Test 1 with thread T2 lit.
- Julia has one picture, the c pad, the two typed parts, and the chips c = 0, c = −0.75, c = i. No second plane, no rabbit, no escape or step slider, no in-page colour key. At c = 0 the disk chip stays pressed and the green walk is still inside. Each chip stays pressed on the value it claims. Typing the real part keeps the imaginary part. Shift+Left twice from 0 yields c = −0.2. A 390px window does not scroll sideways. After the fix, an edge press leaves c at 0 and a 30px drag moves it to about 0.63.
- Newton opens as z³ − 1 with that chip pressed. The guess 0.35 + 0.45i reaches the purple root in 5 steps. No degree chips, no step slider, no scatter chip. Dragging the blue root drops z³ − 1, clears both chips, and writes the product. The z² − 1 chip writes that polynomial and hides the third root. Dragging a root from there keeps two factors.
- The Test 2 colour key is the four lines (stayed / blue root, escaped / orange root, the third root, the green point). A pixel inside the disk at c = 0 is the blue token `#0b63ad`. On `#addresses` the Test 1 key is back, including Arg z and the seam, and the Test 2 list is hidden.
- Test 1 home, after switching back, has 21 stops, twelve topic chips, the finder, and next = addresses. Addresses next is arithmetic. The problem index is still Test 1: previous is the 4D graph, there is no next, and the page does not link to Julia.

## Julia film

Branch `cursor/julia-c-animation-2891`, draft PR 2. Verdict: **accept with fixes**.

### Fixed

- Even samples can miss a sharp bend. An L whose corner was (1.474, 0) played (1.263, 0) and then (1.474, −0.211), a chord of about 0.21. A turn sharper than about 34° now takes the nearest free sample, and the frames stay in order along the path. That L now includes (1.474, 0) itself, and a short leg followed by a long one includes its corner too. Smoke requires the elbow point, not merely a neighbour.
- Every view change cancelled the film, including a resize that does not move the window. Resizing during the first frame dropped the phase to idle and left c on that early frame. The film now keeps going when the centre and the width are unchanged. Panning the picture still stops it.
- Stopping the worker while it was rendering never settled its promise, so the cancelled render stayed alive across the next drag. Cancelling rejects that promise. A real worker failure still draws on the page. A cancel does not.
- After the film, the sharp redraw painted a full-size field into the small canvas the frames had used. `putImageData` clipped it, and the graph kept one stretched corner. The c = 0 chip did the same, so the disk did not come back until the next film’s first frame. The bitmap is sized to the field again before that paint.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, no console errors.
- An off-centre press on the orange handle leaves c at 0. A 30px drag then moves it to about 0.63. The bitmap does not change while the button is down. A tap does not film. A press on the empty pad still jumps.
- A short drag shows “animation loading”, then plays 4 frames, both ends included. A long drag plays 8. Play again returns to the first frame and the same end. The c = −0.75 chip, a typed real part, and Shift+Left still jump, with no film. After a chip, Play again is still there and still replays the dragged path.
- A drag that ends off the pad clamps to a corner of the pad and still plays. A hover afterwards does not keep dragging. Touch does the same: an off-centre tap leaves c alone, a drag plays, and a drag that ends off the pad clamps.
- A second drag that starts while the first is still rendering terminates that worker with no message and no error. The picture stays still, and only the new path plays. A drag that starts on frame 1 of a playback restarts at frame 0 and does not interleave the two films.
- With reduced motion, the same drag leaves the phase idle, hides the loading line, and redraws the picture while the pointer is down.
- While the frames were rendering, two animation frames returned in 29 ms. The longest gap in that window was 17 ms. There was no long task.
- After several films and a garbage collection, the heap grew by tens of kilobytes on one run and about a megabyte on another, not by a buffer for every frame.
- Newton still opens as z³ − 1. The guess 0.35 + 0.45i reaches the purple root in 5 steps. Dragging the blue root clears that chip. Test 1 addresses has 21 stops and does not list Julia or Newton. Its colour key is back and the Test 2 key is hidden. Test 1 home has the finder, twelve topics, and next = addresses. Julia at 390px does not scroll sideways.
- After a film and a return to c = 0, the same two pixels as before the drag are back: the interior sample and the far exterior sample. The picture is the set again, not a corner of it.
- The taste note on this branch asks to remove the film. That is a later batch. This pass only repairs it.

## Julia film, batch 2

Branch `cursor/julia-c-animation-2891`, commit `0c2b0ed`. Verdict: **accept with fixes**.

### Fixed

- The c where you let go was a sample, and it was drawn, but the sharp redraw started in that same turn. The frame never sat for 90 ms, so a coarse drag showed the waist, or the dust past 1/4, only as the still after the movie. The release frame now holds for the same beat as the others. The sharp picture of that c follows.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, no console errors on the Julia runs.
- The step opens at 0.08. Minus and plus move it through 0.04, 0.08, 0.12, and 0.2, and the end buttons disable. The sentence under the chips follows the button.
- A drag of length 0.05, shorter than one step and longer than the 0.04 click floor, plays 2 frames, the start and the end. The overlay reads `animation loading, 0 of 2 frames`, then `1 of 2 frames`. Play again stays hidden until that film is `done`. A tap on the handle does not film. An off-centre press still leaves c at 0. A press on the empty pad still waits until release, then jumps, with no film.
- A straight drag of length 0.80 plays 11 frames, which is length/step + 1, on the step. The same count comes back from the traced polyline. The first frame is on screen while the overlay still says 1 of 11. The gaps between the frames that follow are 90 or 91 ms. After the film, the canvas hash equals a plain jump to that same c, 0.8. The c = 0 chip clears Play again and the stored path, and the picture hash is the opening disk again. The interior sample is back to 11, 99, 173.
- An L still includes its corner.
- A drag of length 3.179 at step 0.04 is 48 frames. The step widens to about 0.068, and both the start and the release are frames. Each worker frame is 220 on the long edge. During that render the longest gap between animation frames was 16.8 ms, and there was no long task. Changing the step while that film was still loading left the 48 frames alone and moved the control to 0.08. The next drag used 0.08.
- Changing the step during playback, from 0.08 to 0.12 on frame 1, does not restart or resample the film. Play again repeats those same frames, then shows itself again. A chip is what clears it.
- A second drag that starts while the first film is still rendering leaves the phase idle, holds the picture and the readout, and plays only the new path. Cancelling the worker adds no console error.
- A drag that ends off the pad clamps to the corner and plays. A hover afterwards does not keep dragging. Touch does the same: the readout stays on the start, then the traced path plays. At 390px the page does not scroll sideways, a drag still films on the step, and a touch that ends off the pad clamps and plays.
- With reduced motion, the picture and the readout stay on the start while the button is down. The release jumps to the end, the phase stays idle, and the loading line stays hidden.
- After three long films and a garbage collection, the heap grew by about 113 KB, not by a buffer for every frame.
- Newton still opens as z³ − 1, with that chip pressed. The guess 0.35 + 0.45i reaches the purple root in 5 steps. Moving the blue root clears the chip. Test 2 nav is still home, Julia, Newton.
- Test 1 addresses has the 21 stops, no Julia and no Newton, and its next link is arithmetic. The Test 1 colour key is shown and the Test 2 key is hidden. Test 1 home has the finder, twelve topics, and next = addresses.
- The batch 2 taste note asks for two further rounds this pass does not take. When 48 frames forces a wider step, the line under the chips still names the step the buttons set, and the overlay still counts N of M. Both are what this batch asked for. Holding the release frame is the one that was already missing from it.

## Julia film, batch 3

Branch `cursor/julia-c-animation-2891`, commit `0afc531`. Verdict: **ship**.

No code change on this pass.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html` so the page sits on a GitHub Pages subpath. No console errors on the Julia runs, on Newton, on Test 1 home, on addresses, or on the switch. No asset response failed. Every resource stayed under `/math-viz/`, including `js/core/julia-anim-worker.js` and the `fractal.js` it imports. A request for `/math-viz` with no slash is redirected to `/math-viz/`.
- The cap is 96. A square loop at step 0.04 played 96 frames, and the line was `Each frame, c moves 0.06 (widened from 0.04 for this long drag).` The same loop at 0.08, 0.12, and 0.2 stayed on the button: `Each frame, c moves 0.08.`, `0.12.`, and `0.2.` The 0.08 film was 74 frames on one pass and 68 on the next, because the pointer did not repeat the square at the same length. Each film showed every index from 0 through its last frame, and each one returned to the start. During the 96-frame render the longest gap between animation frames was 17.4 ms. There was no long task.
- A drag from 0 to −0.75 at 0.08 played 11 frames and ended on −0.75. A drag to 0.45 played 7 frames, one of them within 0.04 of 1/4. A drag to i played 14 frames and ended on i. The release frame of each stayed up for about 90 ms (76 to 100 ms in an animation-frame log, which sees the change on the next frame). The only status text was `animation loading`. It was already showing when frame 0 was drawn, it stayed about 0.7 s (683 ms of that log), and the box sat 1.8% of the way down the picture.
- A drag clears the lit chip on pointer down. Through that drag the readout stayed `c = 0` and the bitmap did not change. A tap does the same unpress, then does not film, and the chip is pressed again once the button is up. A second drag that starts on frame 0 of a film leaves the phase idle, drops the stored frames, and adds no console error. The new path starts at the c where the first film was cut and plays only that path. Touch does the same: the readout stays on the start, then the traced path plays.
- Pressing plus while a widened film was still going left those frames alone and put the line back on `Each frame, c moves 0.08.`
- At 390 px the page does not scroll sideways, before or after a drag, and the drag still plays on the step. The loading box sat 3.2% of the way down the picture.
- With reduced motion, a drag from 0 leaves the phase idle and the loading line hidden. The readout stays `c = 0` and the picture stays the disk while the button is down. The release jumps to the end.
- After a film and a return to c = 0, the blue share was 0.189, the same as the opening disk. Leaving for Newton while a film was loading added no console error.
- Newton still opens as z³ − 1, with that chip pressed. The guess 0.35 + 0.45i reaches the purple root in 5 steps. Test 2 nav is home, Julia, Newton. Test 2 home is the switch and the two stops.
- The switch to Test 1 shows twelve topics, the finder, next = addresses, and 21 menu stops, with no Julia and no Newton. The Test 1 colour key is shown. Addresses next is arithmetic, and that page keeps the Test 1 key. The switch back lights Test 2.

## Test 2 map batch 1 review 1 (close)

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **accept with fixes**.

The map is the same kind of page as Test 1: same spine, finder, topic chips, and card rhythm. Threads F1, F2, and F3 light, the finder lands on Exercise 4.2.4, and the two reveals stay independent. Eight or more citations were opened in the HTML and the PDF. Exercise numbers match. Example, theorem, and figure numbers do not, and the pins now say so. Every check added for this site was recomputed and holds.

### Fixed

- The sequence page multiplied before it recorded the term, so n = 1 of (1/2 + i/4) showed the square. It now records the power, then multiplies. n = 1 reads 0.5 + 0.25i, modulus 0.559.
- An exercise chip used `#problem-`, which opens the teaching stop again. The statement and the two reveals live on the index. The chip now goes to `#index-<id>`. Arriving from `#problem-` marks that chip and says the quote is on the index card. `#index-E4-2-12` scrolls to that card and outlines it.
- Topic N2 paired HTML Figures 4.2.5 and 4.2.6 with PDF Figures 4.3 and 4.4. Both HTML figures are PDF Figure 4.3. PDF Figure 4.4 is the rabbit zoom, HTML Figure 4.2.7.
- Section 4.1, 4.3, 4.4, and 3.3 pins now carry the PDF number: Definitions 4.1.1 and 4.1.7 are PDF 4.1 and 4.2, Theorems 4.1.8, 4.1.17, 4.3.1, 4.4.1, 4.4.3, and 3.3.1 are PDF 4.2, 4.5, 4.12, 4.15, 4.16, and 3.8. Example 3.3.2 is PDF Example 3.11.
- “What the book prints” for Example 4.2.12 had inserted i. The HTML and the PDF both print {0, −1+i, −i, …}. The book block now quotes that list and the four steps; the added check names the skipped i. The c = i chip on the orbit stop says the same.
- Exercise 4.4.3’s printed answers omitted (i), radius 1. It is in the book block.
- Exercise 4.2.12’s chain-rule product was filed as the book. The book only says to show the two derivatives are equal. The product is the added check.
- Exercise 4.2.11 dropped the book’s “show this step”. That hedge is back. Exercise 4.2.5’s subscript f₂ is f_{−2} in both editions, and the printed list starts at −2, omitting the seed 0. Exercise 4.2.1 notes that the next step is undefined only at 0, that N(z) = 0 only at the real points ±1, and that the HTML writes z₁ = N(z₁) where the subscript is z₀. Exercise 4.2.4’s statement includes the book’s “that is, z₁ = f₀(z₀)…”. Exercise 3.3.5 is no longer marked as a full quotation: the card omits (b) and (d).
- The F2 badge was a solid disc. The map line and the menu dot were already dashed. The badge is dashed.
- “One more step” stayed enabled after eight steps. It now disables and reads “Eight steps shown”.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0, including the 27 cards and `#problem-4.2.4` opening the disk.
- Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`. No console errors on Test 1 home, addresses, the switch, Test 2 home, the disk, the sequence, the series walk, the repeat cap, the orbit of 0, one Newton step, half-planes, seeds, Julia, Newton, the index, a topic, `#nope`, or `#home-t2`.
- Test 2 home has 15 stops, wide at 1280px and one column at 390px, three thread paths, F2 dashed, 16 topic chips, next = sequence, and a menu of 15 that includes Julia and the index. F2 focus dims the sequence stop and not Julia. The finder query 4.2.4 opens `#problem-4-2-4`. The Newton sample table matches the book’s iterates through z₅ = i. Seeds has no canvas. Julia’s tag is PDF Example 4.9. The index has 27 cards; the book reveal and the added reveal open separately; group A with “likely” shows nothing; a tick reads “Ticked”.
- At 390px, Test 2 home, the index with the 4.4.6 added reveal open, Julia, and the sequence do not scroll sideways.
- Switching back with the menu control (not a raw `localStorage` write) restores Test 1: 21 stops, twelve topics, the finder, next = addresses, no Julia and no Newton, Test 1 colour key shown. Addresses next is still arithmetic. Test 1 station modules were not edited. `layoutMap` grew an optional label argument and still defaults to the Test 1 labels.
- Added checks that recompute: 4.2.1(d) the squared ratio; 4.2.2; 4.2.4 the modulus |z₀|^(2^k); 4.2.5; 4.2.6; Example 4.2.12 the missing i; 4.2.8; 4.2.12 the chain-rule product; 4.1.1(b) = 1 and (d) = i; 4.3.1(b) = (3 − i)/2; 4.3.5(b) the disk of radius 5 about 0 and (d) the disk of radius 2 about 3 + 4i; 4.4.6 no, because √13 < √17; 3.3.1(b) the Laplacian is 0 off the origin. Book-printed answers that were opened and left as printed: 4.1.1(a) = 0 and (c) = i; 4.1.7 no; 4.2.9; 4.2.11 the magnitude √(3 − √6) < 1; 4.3.1(a) = 1 + i; 4.3.5(a) and (c); 4.4.3 radii ∞, 3/5, 1/3, 4/3, and 1; 3.3.1(a); 3.3.5(a) and (c).

### For the builder, in order

1. The footer colour key says blue twice and purple twice: once for the pictures, once for F1 and F2. Keep the four picture lines. The map legend already names the threads. Drop the last two lines the next time the key is touched.
2. `#problem-<id>` still opens the teaching stop, which is what Test 1 does and what the smoke test requires. The chip is the way to the quotation. Leave the router alone. A student who only uses the finder has to notice that chip.
3. Several “what the book prints” blocks are still shorter than the solution (4.2.1(a) and (c), 4.2.3, 4.2.7, 4.1.9). The ones that contradicted the book were repaired. Do not rewrite the rest into full transcriptions.
4. An F1 link is omitted when it is the same stop as map previous or next. On the sequence page that hides F1 entirely, because home and series are those neighbours. That is the Test 1 rule. Do not add a second copy of the same link.
5. Seeds carries nine exercise dots. At phone width each stop is its own row, so they fit. On the wide map they sit on one pill. Look at that pill before adding another seed exercise.

## Test 2 map batch 1 review 2 (mid)

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **accept with fixes**.

The page was already the same kind of page as Test 1. A student who had used that map would not have felt one story. Three stops linked back to Test 1. The disk, the sequences, the Julia picture, and the Newton picture did not. The cycle on the sequence page is the eighth roots of unity, and the Newton picture opens on the cube roots of 1, and neither page said so with a link. The colour key gave blue two jobs and purple two jobs.

### Fixed

- Every teaching stop now has a “The same story” panel. The chips name the Test 1 stop they continue: powers and roots for a sequence, squaring and the slide for an orbit, the unit disk and the staircase for c = 0, the derivative for one Newton step and for |f′| < 1, addresses and 1/z for the half-plane step, disks for a geometric series and a radius. A chip that says Test 1 switches the map. The switch brings you back.
- Julia links to the orbit stop, the set of c, Powers, Arithmetic, and Roots. Previous is still the disk. Next is still the orbit of 0. Newton links to Roots and the Derivative. Previous is still the five steps. Next is still the real line. Both pictures also link to the index, the way the other stops do.
- The four-line spine and the night-before plan name those same stops. The plan opens on Powers and Roots, walks Newton after the Derivative, and ends on the Julia picture at c = 0 and at c = i. The times still add to about two hours.
- The epigraph paints the four teaching colours in the picture sense: blue stayed, orange escaped, purple the third root, green the start you drag. The colour key is those four lines. The map legend still names F1, F2, and F3. F3 is a diamond in the menu and on a badge, the way T3 is.
- Each index card carries the thread badge the map uses. The two section 3.3 cards stay without one, because that stop is on no thread. The seeds page cites Definitions 4.2.18 and Theorem 4.2.20 with 4.2.17. The Julia page cites f_c(z) = z² + c as well as K_c.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0.
- Headless Chrome, no console errors. Test 2 home has 15 stops, the four coloured words, and the plan’s seven steps. A Powers chip on that page opens Test 1 Powers. The menu switch returns to Test 2 home. Julia’s story chips, previous, next, and index are the links above. Newton’s are too. The sequence, disk, seeds, half, series, repeat, geometric series, radius, harmonic, and one Newton step pages each open with a section tag and the story chips. The disk’s cube-root chip names a non-real cube root of unity.
- The Test 2 colour key is four lines, and the Test 1 key is hidden on that map. F2’s badge is dashed. F3’s badge is a diamond. The index has 27 cards: 13 on F2, 4 on F3, 8 on F1, and the two harmonic cards with no badge.
- At 390px, Test 2 home, the index, the sequence page, and Julia do not scroll sideways. Test 2 home is one column.
- An F1 link is still omitted when it is the same stop as map previous or next. On the sequence page that is home and series. The story chips are a different list.

### For the builder, in order

1. The Julia and Newton pictures are being restyled on `cursor/unify-fractal-ui-fc73`, which is not merged and was not imported here. When that work lands, keep “The same story” and the source tags. The panel is the link from the picture back to the disk, the orbit of 0, the five steps, the real line, and the Test 1 stops.
2. Do not add a Cartesian or polar “easy address” row to a Chapter 4 card. Those exercises are not address exercises. The thread badge is the cue that matches the map.
3. F1 runs through the spine on purpose, so the purple line does not separate places. Do not add a fourth thread, and do not put F1 dots back in the menu.
4. Orange is still both an escaped pixel and the c handle. The key and the Julia page say the handle is the slide. Do not add a fifth colour.
5. The close pass left three items this pass did not take: shorter book blocks, the `#problem-` router, and the seeds pill. The colour-key lines that named blue and purple twice are done.
6. The orbit stop is still cited as “iteration, after the Newton pictures” in §4.2. That is a section, not a numbered definition. Leave it unless a numbered item turns up.

## Test 2 map batch 1 review 3 (wide)

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **accept with fixes**.

The story in one sentence: a point has two addresses and a function moves the plane; the colour of a start is the fate of doing that motion again.

That is the right big idea for Test 2. Sequences are the language (a list settles, or it is bounded). The pictures are the motion done again: square, then slide; blue stayed and orange left; Newton’s colour is which root the walk finds. Sections 4.3 and 4.4 are that same fact said about a series, inside a disk and outside it. Section 3.3 is a different chapter.

Before this pass, a student opening Test 2 home did not see that idea. The first painted thing was an amber box, “confirm with your syllabus,” and the thesis under it was grey. Then sixteen topic chips, three of them stamped Likely or Possible, then the finder. The walk was a black list of coordinates. The four colour words sat in a later panel whose bars were purple, blue, green, and blue. Plan step 1 said to say the four colours out loud, and the bars were the colours in front of them, so orange never got said. The index opened on Exercise 4.2.1, the half-plane proof, with sequences filed as group D. The two-hour plan gave the whole index and the optional sections the same 25 minutes.

F1 plants the right question: does the list settle? One power goes to 0, and `((1+i)/√2)^n` cycles the eighth roots of unity. F2 plants square-then-slide, the disk at `c = 0`, and the orbit of 0. F3 plants one Newton step, which root, and the real line as a wall. The seeds stop plants a gap, “there is no picture,” louder than the definition. Harmonic, reached by Next after the radius, plants a Laplacian. That is the wrong last idea.

Sections 4.3 and 4.4 are not a distraction as the last stops on the map. They were a distraction in the opening list and on the clock. Section 3.3 is a distraction on the Next path. It stays marked Possible. It should not lead, and it should not be the stop between the radius and the index.

### Fixed

- The thesis is the first sentence, in the display face. The walk is the next panel, and the fate line is blue when the start stays and orange when it leaves. Pressing `c = i` turns that line orange. The coordinate list comes after the colour.
- Likely and possible topics moved to a panel under the plan, “Only if the syllabus names them.” They are off the two-hour clock. The plan is 5 + 15 + 25 + 25 + 10 + 30 + 10 minutes. Step 1 names the picture colours and says the bars are the threads.
- The index opens on Core, in map order: sequences, Julia, Newton, then the set of c. A link to a likely or possible card, such as `#index-4-4-6`, still opens that card and presses its chip. The footer no longer repeats the syllabus warning on every stop.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0, including the new check that the core cards run AAAA BBBB CCCC then nine Ds, and that the first card is 4.1.1.
- Headless Chrome, no console errors on Test 2 home, the sequence page, Julia, Newton, the index, and the switch back to Test 1. After the title, the page is the walk, the four lines, the map, the plan, the core topics, the finder, then the later sections. At 800px the blue fate line sits on the first screen. At 390px the home does not scroll sideways.
- The thread bars are still purple, blue, green, blue. The new sentence under the colour line says those bars are F1, F2, and F3, and that orange is a picture colour. The colour key is still the four picture lines.
- The index shows 21 core cards and hides the six likely and possible ones until their chip is pressed. Test 1 home, after the menu switch, still has its topic list and the Test 1 colour key.
- “The same story” panels were not edited.

### For the builder, in order

1. Take section 3.3 off the Next step between the radius and the index. Keep the stop, the Possible mark, and the two cards. A student who only presses Next should finish on the index, not on a Laplacian. Sections 4.3 and 4.4 stay where they are.
2. On the seeds stop, lead with which `c` keep the orbit of 0 bounded. “This site does not draw that set” is the second sentence. The absence is not the idea.
3. Do not repaint F1, F2, or F3, and do not add a fifth colour. The bars are the threads. The words are the pictures. Orange remains both an escaped pixel and the `c` handle.
4. Leave the same-story panels. Leave the three items the close pass already deferred: shorter book blocks, the `#problem-` router, and the seeds pill.

## Test 2 map batch 2

Branch `cursor/test2-map-58db`. The three ranked lists, applied, and the flat paper brought onto the spine of the page. `js/stations/julia.js` and `js/stations/newton.js` were not edited. PR #3 owns those files.

### Taken from the lists

1. The colour key was already four lines. The two lines that named blue and purple a second time, for F1 and F2, were gone. This pass rewrote the four picture lines in the council’s words and did not add a fifth. Blue is a landing that stayed: settles or stays. On a pin it is the blue root. Orange on a landing means the walk left. Orange on a pin means that root. The same orange line says the Julia handle for c is still orange, and that on the flat paper c is a hollow square. Purple is the third root only. Green is the plant. There is no fifth colour.
2. `#problem-<id>` still opens the teaching stop. The chip is still the way to the quotation. The router was left alone.
3. The shorter “what the book prints” blocks were not expanded into full transcriptions.
4. An F1 link that is the same stop as map previous or next is still omitted. The sequence page still has no second copy of home or series.
5. Seeds still carries nine exercise dots. No new seed exercise was added. At phone width each stop is its own row. On the wide map those nine sit on one pill, and that pill was left as it is.
6. No Cartesian or polar “easy address” row was added to a Chapter 4 card. No fourth thread. F1 dots were not put back in the menu. F1, F2, and F3 were not repainted. The bars stay the threads.
7. The orbit stop is still cited as “iteration, after the Newton pictures” in §4.2. No numbered definition turned up, so the citation stays.
8. Section 3.3 is off Next. The stop, the Possible mark, and the two cards stay. Its map order is 16, after the paper, so the drawing and the menu do not place it between the radius and the index. Next from the radius opens the index. Next from the index opens the paper. The paper has no Next. Harmonic’s own links are the index and the paper, and it has no Next. Sections 4.3 and 4.4 stay where they are.
9. The seeds lede opens “Which c keep the orbit of 0 bounded”. “This site does not draw that set” is the next sentence. The panel title matches. The same-story panels were kept. A chip for the flat paper was added in front of those chips on the stops the paper covers. Harmonic did not get one: the paper does not use §3.3.

### How prominent the paper is

The paper is the first panel under the thesis, and the primary button is “Open the flat paper”. “Start with a sequence” stays on the page and is not the primary. The night-before plan opens on the four words. Next order is still the book: sequences through the radius, then the index, then one further Next into the paper. The paper does not replace the map, and it is not inserted before sequences. A student who only presses Next still walks the syllabus and finishes on the index, then opens the page that uses one plant and the same four words for the twist, the correction, and the stack.

### Julia and Newton text, listed here and not edited

When PR #3 lands, keep “The same story” and the source tags, and change the two ledes.

- Julia, `#julia-lede`. Say that blue means the landing stayed and orange means it left. Say that the orange handle is c on this picture only, and that on the flat paper c is a hollow square. Link to `#paper`. Keep the tags for \(K_c\) after Example 4.2.8 [PDF Example 4.9] and for \(f_c(z) = z^2 + c\). Previous stays the disk. Next stays the orbit of 0.
- Newton, the station lede and `#newton-book-colour`. Say that orange on a pin is that root, not a walk that left. Link to `#paper`. Keep the citation of the colouring before Figure 4.2.5 [PDF Figure 4.3], and the sentence that the book colours \(z^3 + 1\) while the picture colours \(z^3 - 1\). Previous stays the five steps. Next stays the real line.

The colour key, the Test 2 home, the index (`#index-fates`), and the paper already say this.

### Checked

`node tools/fractal-smoke.mjs` exits 0, including radius → index → paper, a null Next on the paper, and harmonic absent from that list and ordered after the paper. Headless Chrome, served under `/math-viz/`. Test 1 home is 21 stops, with no paper and no Julia, and the menu switch back restores that. On Test 2, `#home-paper` is before the walk, `#home-open-paper` is the primary button, c = 0 settles, c = −0.75 stays, c = i leaves, the notch is an unfilled square, and the paper panel cites Definitions 4.1.1, Example 4.2.1, and Theorem 4.3.1. The colour key is four lines. Seeds leads with the bounded orbit. The radius page still names Disks in “The same story” and now names the flat paper. At 390px the home is one column, and the home, the paper, and the index do not scroll sideways. No console errors.

## Batch 2 close review

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **ready for the mid reviewer**.

No code change on this pass. `js/stations/julia.js` and `js/stations/newton.js` were not edited.

The flat paper is the first panel under the thesis, and “Open the flat paper” is the primary button. Next runs radius → index → paper and stops. Section 3.3 stays on the map, after the paper, with links to the index and the paper and with no Next. Seeds opens on which c keep the orbit of 0 bounded. The colour key is four lines: blue settles or stays, and on a pin it is the blue root; orange on a landing means the walk left, and on a pin it is that root; purple is the third root only; green is the plant. c is a hollow square. There is no fifth colour. The same-story chip for the paper is the first chip on every stop the paper covers, and harmonic does not have one.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0.
- Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`, at 1280px, 390px, and 360px. No console errors and no failed asset responses on Test 2 home, the sixteen Test 2 stops, the switch back to Test 1, or the skip link. No page scrolled sideways. Buttons, chips, station links, the colour-key summary, and the plant handle are at least 24px; the handle is 32px and the header buttons are the 44px tap size.
- On the paper, the opening plant is (1+i)/√2 at c = 0: powers stay, squares settle at 1, |z| = 1, |2z| = 2, and the product of the eight factors is 256. Again is already at the cap and reads “Eight steps shown”. A drag clears the example, the line reads “Planted. Press Again to apply the formula once.”, and eight presses fill the cap again. The ninth does not. Inside settles, 3/2 leaves, c = −0.75 stays, c = i leaves, and c = 0 after c = i keeps the green plant and settles. The book chip names i in 5 steps. A real seed leaves and stays real. The guess names the purple root. The geometric pile settles at 1 + i. On the circle the bags stay. 6/5 leaves, and two more presses hit the cap. Each grip presses its own chip and shows only its examples.
- Home: c = 0 settles, c = −0.75 stays, c = i leaves, and only the pressed chip stays pressed. F2 dims the sequence stop and not Julia, and a second tap clears it. The finder chip 4.2.4 opens `#problem-4-2-4`. The skip link stays on the paper. The menu paper link closes the drawer and opens the paper. Switching back restores 21 Test 1 stops, with no paper and no Julia, and the Test 1 colour key.
- The index opens on 4.1.1, 21 core cards. Likely is 4.3.1, 4.3.5, 4.4.6, 4.4.3. Possible is 3.3.1 and 3.3.5. Group D shows nine. `#index-4-4-6` presses Likely, outlines that card, and the added reveal opens. Tick writes “Ticked” and the second press clears it.
- Repeat’s “One more step” disables at eight and reads “Eight steps shown”. Sequence n = 1 is 0.5 + 0.25i, modulus 0.559. The cycle chip says the limit does not exist. Disk outside is unbounded. The orbit of 0 opens on the printed list that skips i. Julia’s c = 0 chip stays pressed and the step button moves 0.08 to 0.12. Newton opens on z³ − 1 and the guess reaches the purple root in 5 steps.
- Every in-page `#` link on those stops resolves to a station. The Next chain is home, sequence, series, repeat, disk, julia, zero, newton-step, newton, half, seeds, geometric, powerseries, index, paper.
- Citations were opened in the HTML edition and in the PDF. Anchors exist. HTML numbers match the pins: Definitions 4.1.1 and 4.1.7, Theorems 4.1.8 and 4.1.17, Examples 4.2.1, 4.2.4, 4.2.8, 4.2.12, 4.2.16, and 4.2.23, Theorems 4.2.11, 4.2.19, and 4.2.20, Definitions 4.2.17 and 4.2.18, Figures 4.2.5 and 4.2.6, Theorem 4.3.1, Theorems 4.4.1 and 4.4.3, Theorem 3.3.1, Equations 3.1.1 and 3.1.10. The PDF numbers match too: Definitions 4.1 and 4.2, Theorems 4.2 and 4.5, Examples 4.7 through 4.12, Theorems 4.9, 4.10, and 4.11, Definitions 4.9 and 4.10, Figure 4.3 (parts a and b; Figure 4.4 is the zoom), Table 4.1, Theorems 4.12, 4.15, and 4.16, Theorem 3.8, Example 3.11. Exercise numbers are the same in both editions, including 4.2.1 at the exercises anchor and 4.2.5’s printed slip `f_2` for `f_{-2}`.
- Recomputed and left as printed or as the added check: 4.1.1 (a) 0, (b) 1, (c) i, (d) i; 4.1.7 the eighth roots; 4.1.17 the two ε-conditions; 4.2.4 the modulus |z₀|^(2^k); 4.2.5 and Example 4.2.12, including the skipped i; Example 4.2.1’s table through z₅ = i; 4.2.1 the half-plane formula and the squared ratio; 4.2.2 N(z) = (z + 1/z)/2; 4.2.8 the gap c − 1/4; 4.2.9 the pair −2 and 2; Example 4.2.16 the disk |c| ≤ 1/4; 4.2.11 √(3 − √6) < 1; 4.2.12 and Example 4.2.23 the cycle derivative |4 + 4i| > 1; 4.3.1 (a) 1 + i and (b) (3 − i)/2; 4.3.5 the four disks; 4.4.6 √13 < √17; 4.4.3 the printed radii ∞, 3/5, 1/3, 4/3, and 1; 3.3.1 the Laplacian off the origin; 3.3.5 (a) and (c). The eighth-root product on the paper is 256.

### For the builder, in order

1. Julia and Newton still use the sentences from before this batch, and their same-story chips do not start with the paper. PR #3 owns those files, so this pass left them. When that work lands, say that blue stayed and orange left, that the orange handle is c on the Julia picture only, and that on the paper c is a hollow square. On Newton, say that orange on a pin is that root. Link both to `#paper`. Keep the source tags, and keep previous and next as they are.
2. The chip 0.35 + 0.45i shows five steps on the paper and says they have not landed, while the Newton picture says that same guess reaches the purple root in 5 steps. At step 5 the point is still about 0.003 from that root. The picture treats squared distance 1e-4 as arrival. The paper waits for 1e-10, which is the next step. Both sentences are true of their own test. Use one meaning of “landed” the next time either sentence is touched. Do not edit `newton.js` for this.
3. Seeds still has nine exercise dots. On the wide map they are one row under the name, 80px across, inside the column even at 712px. On the phone each stop is its own row. Leave the row unless another seed exercise is added.
4. An F1 link that is the same stop as map previous or next is still omitted. The sequence page still has no second copy of home or series. Leave that.
5. The shorter book blocks and the `#problem-` router stay as the first close pass left them. The numbers opened on this pass match the book. Theorem 4.4.3 shares the link that opens Theorem 4.4.1. Both numbers are right. A student scrolls from 4.4.1 to 4.4.3.

## Batch 2 mid review

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **ready for the wide reviewer**.

A Test 1 student would recognise the place. Both homes are titled The Map, in the same type, the same cards, and the same header. The sentence that carries is the Test 2 thesis: a colour is the fate of repeating one motion, and Test 1 taught that motion. The flat paper is the first panel under that sentence, and it is the last Next after the index. The four words, the unit circle, and the hollow square are the same words on the home, the key, the index, and the teaching stops this branch owns.

Landed means within 0.01 of a root. That is squared distance 1e-4, the test the Newton picture already uses. It is not the word settles. Settles is Definition 4.1.1, every disk, and no finite step is that. The guess 0.35 + 0.45i is 0.003 from the purple root at step 5, so both pages now say it has landed in 5 steps. Step 4 of that walk is 0.057 away, so four steps have not landed. Example 4.2.1 still draws all five printed steps. The fourth is already within 0.01 of i. The fifth is the iterate the book prints on i. The paper says both.

`js/stations/julia.js` and `js/stations/newton.js` were not edited.

### Fixed

- The paper’s arrival test is 1e-4, and the fate line says “within 0.01, the same test as the Newton picture.” A requested step is still drawn after that arrival, so the book’s fifth iterate stays on the page. The aside on z² + 1 and the one-step lede say the fourth step is the one that landed.
- Teaching stops now wear the thread badges Test 1 puts under the title. The index header does too. The paper stays without a badge: it is the table the three threads sit on, which is the cut the council already made.
- The later-sections sentence no longer calls a series that settles “the same fact as a walk that stays.” Settles is inside the disk. Leaves is outside it. Stays is the list that remains on the circle.
- The disk, the sequences, the orbit of 0, the seeds, the half-plane, and the two series stops lead with settles, stays, leaves, or which root, and they name the unit circle as the wall or c as a hollow square where that stop is about one of those. The book’s printed answer, the geometric value (3 − i)/2, and the 4.4.6 verdict are closed on the index until asked.
- The word Possible is no longer orange. Orange stays a landing that left, and a pin.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0, including Test 1 at 21 stops, the book trail still six points long, the guess landed at step 5, and four steps of that guess not landed.
- Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`, at 1280px and 390px. No console errors and no failed assets. The walk was Test 1 home, the menu switch, Test 2 home, the paper, the index, every Test 2 stop, and the switch back. Nothing scrolled sideways. Test 1 came back as 21 stops, next = addresses, Test 1 colour key shown, no paper and no Julia.
- The colour key is four lines. Blue settles or stays, and on a pin it is the blue root. Orange on a landing means the walk left, and on a pin it is that root, and the key says the Julia handle is orange while the paper’s c is a hollow square. Purple is the third root only. Green is the plant. There is no fifth colour. Amber on a Likely banner is the syllabus mark. It is not in the key.
- Every Test 2 place is on the map and in the menu. Map previous and next run home, sequence, series, repeat, disk, julia, zero, newton-step, newton, half, seeds, geometric, powerseries, index, paper. Harmonic is after the paper, with links to the index and the paper and with no Next. An F1 or F2 link that repeats a map neighbour is still omitted. On the disk that hides both thread links, because those neighbours are repeat and Julia. The badges name F1 and F2 there.
- Same-story chips on the stops this branch owns start with the paper and name Powers, the slide, Roots, or the Chapter 1 stops (distance, disks, the staircase, addresses, 1/z) where that stop continues them. Harmonic’s chips are Cauchy–Riemann and Powers. It has no paper chip.
- Every concept and every card cites Howell & Mathews. The pins carry the section and the numbered item: definition, theorem, example, figure, or exercise. The repeat stop is still “iteration, after the Newton pictures,” a section with no numbered definition.
- Julia and Newton still use the sentences from before this batch. Their same-story chips do not start with the paper. Their headers do not list F1/F2 or F1/F3. The pictures themselves still draw, and Newton’s readout still says the guess reaches the purple root in 5 steps, which is now the paper’s sentence too.

### Ready patch, after PR #3 merges

Do not apply this while PR #3 owns the files. When it lands, replace the lede and the chips. Keep the source tags, and keep previous and next as they are. Add the thread badges in the same edit, under the lede, the way the other Test 2 stops now do.

Julia, `#julia-lede`. Replace the prose string with this, and put an anchor `#paper` on the words “Open the flat paper”:

> Every point is a starting place. The rule is square, then slide by c. Blue means the landing stayed: it settles or it stays. Orange means it left. The orange handle is c on this picture only. On the flat paper, c is a hollow square. Squaring is the power from Test 1. The slide is addition. The previous stop is the disk at c = 0. The next stop is the orbit of 0. Open the flat paper.

The muted line in `#julia-c-panel`:

> The orange handle is c on this picture only. Orange on a landing means the walk left. On the flat paper, c is a hollow square. While you drag, the picture and the numbers stay where they were, and the handle follows. Let go and the picture plays that path. Type the two parts, or pick an example, to jump. The pad runs from −1.6 to 1.6.

`storyLinks('julia-story', …)`, paper first, then the chips already there:

- `#paper` — The flat paper: blue stayed, orange left, c a hollow square — `julia-link-paper`
- `#repeat` — Test 2, one orbit, step by step — `julia-link-repeat`
- `#seeds` — Test 2, which c keep 0 bounded — `julia-link-seeds`
- `#powers` — Test 1, Powers: squaring — `julia-link-powers`
- `#arithmetic` — Test 1, Arithmetic: the slide — `julia-link-arithmetic`
- `#roots` — Test 1, Roots: the unit circle — `julia-link-roots`

Badges under the lede: F1, then F2.

Newton, the station lede. Replace the paragraph, and put an anchor `#paper` on “Open the flat paper”:

> This picture opens on the cube roots of 1, from Roots on Test 1. The colour is which root. Orange on a pin is that root. Orange on a landing, on the flat paper, means the walk left. Landed means within 0.01 of the root, the same test as the flat paper. The guess 0.35 + 0.45i reaches the purple root in 5 steps. Green is the guess. Blue, orange, and purple are the three roots. The previous stop is the book’s five steps. The next stop keeps a real seed on the real line. Open the flat paper.

Leave `#newton-book-colour` as it is: the book colours z³ + 1, this picture colours z³ − 1, and the colour means which root. Leave `TOL2 = 1e-4`. That number is the paper’s test now.

`storyLinks('newton-story', …)`, paper first:

- `#paper` — The flat paper: which root, and orange on a pin — `newton-link-paper`
- `#roots` — Test 1, Roots: the cube roots of 1 — `newton-link-roots`
- `#derivative` — Test 1, the derivative: the zoom in the denominator — `newton-link-derivative`

Badges under the lede: F1, then F3.

### For the builder, in order

1. Apply the patch above when PR #3 has merged. Until then the two pictures are the one place a Test 1 student does not hear the paper’s words. The readout on Newton already agrees with the paper. The lede does not.
2. Keep omitting a thread link that repeats map previous or next. The disk’s badges are the list. A second copy of Julia would be the same link twice.
3. Seeds still has nine exercise dots on one pill. Leave the row.
4. The shorter book blocks and the `#problem-` router stay as the first close pass left them.
5. Do not paint F1, F2, or F3 a new colour, and do not add a fifth. Amber on Likely is the syllabus mark. Orange is a landing, a pin, and the Julia handle, and the key already says which.
6. Leave the repeat citation as “iteration, after the Newton pictures” unless a numbered item turns up. Leave harmonic off the four words. The paper does not use §3.3.

## Batch 2 wide review

Branch `cursor/test2-map-58db`, draft PR 5. Verdict: **READY TO MERGE**.

The throughline, across both tests, in one sentence: a point has two addresses and a function moves the plane; the colour of a start is the fate of doing that motion again.

Test 1 is the addresses and the one motion. Test 2 is the colour of doing that motion again. The flat paper is the page a student can carry into the exam: one plant, three formulas, four words, the unit circle as the wall, and the product of the pinches as a number beside the fate. The book prints the table after the calculation. The site makes the word change while the plant is still under the finger: the two trails part on the circle, `|z| < 1` while `|2z| > 1`, a real seed never names a root, and Again turns “not yet” into “leaves.”

The ideas have converged. Another reframe round would reopen the sphere, the tilt, and a new front door. What is left is a merge, not a new pitch.

`js/stations/julia.js` and `js/stations/newton.js` were not edited.

### The one mark

Served under `/math-viz/`. The sentence is the fate line. It flips when the mark moves.

- Test 2 home. The mark is the slide chip on the fixed plant `0.45 + 0.2i`. `c = 0` settles. `c = i` leaves. The map, the finder, and the plan do not have a second mark.
- `#paper`. The mark is the green plant. Crossing the unit circle flips settles, stays, and leaves, and the two trails part. Crossing a basin flips which root. A real plant on `z² + 1` flips which root into leaves. The formula chip names which sentence is on the line. It is not a second gesture.
- The index. No mark. A scope chip and a tick do not flip a theorem. It is the shelf of quotations. The lede points at the paper. Left that way.
- Sequence. The mark is which sequence. “The limit exists” flips from true, `(1/2 + i/4)^n` settles, to false, the eighth roots stay.
- Series. The mark is which list of the one series `Σ i/n`. The bags settle at 0. The pile of those same terms has not settled: eight steps of the harmonic sum are still climbing, from 1 to about 2.72, so the word is not leaves. Theorem 4.1.17, Exercise 9, and Exercise 17. What the book prints stays on the index.
- Repeat. The second start is gone. `1/2` and `0.45 + 0.2i` share a fate at `c = 0`, at `c = −0.75`, and at `c = i`, so that chip flipped nothing. The mark is the latest footprint of the one green plant. At `c = i`, Again flips “not yet” to “leaves” on the step whose modulus passes 8. At `c = 0`, Again does not flip “settles.” `c` is the notch.
- Disk. The mark is where the start sits against the unit circle. Inside settles, outside leaves, `z = −1` settles, the non-real cube root of 1 stays.
- Julia. Two marks: the orange `c`, and the green start. Moving `c` flips “the blue region is a disk.” Moving the green start flips “this walk stayed.” The one a student should watch is `c`. The green start is the orbit the repeat page and the paper already show. Not edited. The words are still the ones from before the paper.
- The orbit of 0. The mark is `c`. “The orbit of 0 is bounded” flips from true to false at `c = 0.3`.
- One Newton step. The table does not move. It is Example 4.2.1, which the exam asks you to compute, so it stays. One sentence now says the flip lives on the paper. The degree-1 line is Exercise 3, one subtraction, not a second picture.
- Newton. Two marks: the green guess, and the roots. “Which root” flips when the guess crosses a basin. Dragging a root changes the polynomial. The paper correctly refuses that second gesture. Not edited. The words are still the ones from before the paper.
- Half-planes. The mark is the seed. Which root flips to leaves when the seed is real, and again when it is imaginary for `z² − 1`.
- Seeds. The mark is `c`. “The orbit of 0 stays bounded” flips. The cardioid is no longer a lecture on this page. `|f′(z₀)| < 1` is the number beside the fate on the paper. Definitions 4.2.17 and 4.2.18 and Theorem 4.2.20 still cite it.
- Geometric series, marked likely. The mark is where `z` sits. `(1+i)/2` settles, `(1+i)/√2` stays, `6/5` leaves. Theorem 4.3.1. The other value in Exercise 1 stays closed on the index.
- Radius, marked likely. The open page no longer prints `√13 < √17`, which is the check for Exercise 6. The mark is a point against the disk of radius 2 for `Σ (z/2)^n`. `|z| = 1` settles. `|z| = 3` leaves. Theorems 4.4.1 and 4.4.3. The unit circle is that wall read at radius 1.
- Harmonic, marked possible. No mark. The Laplacian does not flip, and it is not the fate of a repeated motion. It does not serve the throughline. It stays off Next, with no paper chip.

Every page on the Next path serves the throughline. Harmonic does not, and it is not on that path. Julia and Newton serve it in the picture and not yet in the sentence. That is the patch below, not a reason to hold the branch.

### The merge

PR #3 (`cursor/unify-fractal-ui-fc73`, `00d18a0`) first, then this branch. A trial merge does not have one conflict. It has eight. Taking this branch’s `js/stations/home-test2.js` and hoping the rest auto-merges leaves conflict markers. The order is still the right one. The resolution is:

1. `js/stations/home-test2.js`. This branch, the whole file. PR #3’s copy is a four-line lede on the older home. This file is the Test 2 map, and it imports `js/data/book.js` and `js/stations/test2-ui.js`.
2. `js/stations/julia.js`. PR #3, the whole file. This branch’s story links are not in that layout.
3. `js/stations/newton.js`. PR #3, the whole file. `TOL2` there is already `1e-4`.
4. `index.html`. This branch’s four lines in `#colour-key-test2` (settles or stays, the hollow square, purple only as the third root, green the plant). Keep PR #3’s `#colour-key-julia` and `#colour-key-newton` lists.
5. `css/components.css`. Keep this branch’s `.source-tag`, `.scope-banner`, `.walk-list`, `.book-answer`, and `.added-check`. Also hide `#colour-key-julia` and `#colour-key-newton` by default, and keep PR #3’s rules that show one key per station. One side alone either drops the Test 2 styles or leaves a Julia key on Test 1.
6. `tools/fractal-smoke.mjs`. Keep both import blocks and both check blocks. PR #3’s citation checks and this branch’s paper and map checks.
7. `REVIEW_LOG.md` and `RESEARCH_LOG.md`. Keep both tails.
8. `js/app.js` auto-merged in the trial. Leave that merge.

That resolution leaves one site: PR #3’s picture layout, this branch’s map, paper, colour words, and checks.

### The patch, after both have merged

Do not apply the patch in the mid review. It names `#julia-c-panel`, `storyLinks`, and a badge list. PR #3 removed those. The page is `mountFractalPage`. Badges are already drawn from the station’s threads. Previous and next already come from `mountLinks`. Adding a paper card to `JULIA_EARLIER.ideas` or `NEWTON_EARLIER.ideas` fails PR #3’s smoke, which locks those lists.

Julia, the `lede` string passed to `mountFractalPage`:

> Square, then slide by c. Blue means the landing stayed. Orange means it left. The orange point is c on this picture only. On the flat paper, c is a hollow square.

After `mount`, append an anchor `#paper` to `page.lede`, id `julia-link-paper`, text “Open the flat paper”.

`pictureCaption`:

> Green is one start. The orange point is c on this picture only. Orange on a landing means the walk left. On the flat paper, c is a hollow square. Drag c and let go: the blue region stops being a disk.

In `JULIA_EARLIER.text`, add the pin the section line does not carry: Example 4.2.8 [PDF Example 4.9], and `f_c(z) = z² + c`. Do not change the idea list. PR #3’s source line stays “Chapter 4, § 2”, which is what its smoke checks.

Newton, the `lede` string:

> The colour is which root. Orange on a pin is that root. Orange on a landing, on the flat paper, means the walk left. Landed means within 0.01.

Append the same kind of anchor, id `newton-link-paper`. In `pictureCaption`, add that orange on a pin is that root. Leave `NEWTON_EARLIER` as it is: it already names Figure 4.2.5 and that the book colours `z³ + 1`. Leave `TOL2 = 1e-4`.

That is four strings and two anchors. It is the small patch.

### Checked

`node tools/fractal-smoke.mjs` exits 0. Test 1 is 21 stops.

Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`. No console errors. The home fate line flips from settles at `c = 0` to leaves at `c = i`. The series line flips from “settles” to “has not settled.” Repeat opens on settles, `c = i` reads “not yet,” and Again flips it to leaves. The second start chip is gone. Geometric flips settles, stays, leaves. The radius page flips settles to leaves and does not print `√13`. The paper opens with its plant. The menu switch back to Test 1 restores 21 stops, with no Julia and no paper.

## Batch 1 review 1 (close)

Branch `cursor/unify-fractal-ui-fc73`. Verdict: **accept with fixes**.

### Fixed

- Both source slots were empty. The book is Howell & Mathews, *Complex Analysis*, the free open edition. Section 4.2, “Julia and Mandelbrot Sets”, is the section that does both jobs: it starts with Newton’s method for a complex polynomial and then studies z² + c. The page is https://complexanalysis.org/web/sec_julia-mandelbrot.html. The line is `Textbook: Howell & Mathews, Complex Analysis, Chapter 4, § 2.` The section is stored as chapter 4, section 2, which is how this file already prints a section. Writing `4.2` into the section field would have printed “Chapter 4, § 4.2”. Both stations share one frozen entry. The citation is the link, and it opens in a new tab so the picture stays. “Textbook:” stays ordinary text. Smoke now requires that line and that url.
- After a film the loading line kept the words “animation loading” while hidden. The next film wrote the same words again, so a screen reader had nothing new to say. The words are cleared when the box hides, and written again when the next film shows it. On screen the only status text is still `animation loading`.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`. No console errors on Julia, Newton, Test 2 home, or `#addresses`. No asset failed. Every resource stayed under `/math-viz/`. A request for `/math-viz` with no slash is redirected to `/math-viz/`.
- The two stations are the same page. Picture, then the rule. At 1280px the columns are 608px and 320px and the picture starts at the same height as the rule. At 390px the rule sits under the picture and the page does not scroll sideways, before or after a drag, and the textbook line wraps inside its own width. Addresses waits until a wider window to sit side by side, and on a 900px window its plane starts near the bottom. The fractal plane starts higher, which is why this batch used 52rem. The header is still title, lede, badges. The source line is the extra row the slot was built for, between the lede and the F1 badge.
- Orange c and green z are different handles. c is `rgb(168, 67, 0)`, labeled c, radius 8. z is `rgb(0, 110, 83)`, labeled z, radius 7, and it draws the walk. At the opening they are 70px apart and a press on each centre grabs that handle. When the two dots are stacked, the orange one is on top. A press on the rim of c leaves c at 0, clears the chip while the button is down, and does not film. A tap puts the chip back. A press on the empty plane does not move c, does not move the walk, and does not pan. That jump left with the pad. On a phone the hit areas are 44px and the centres are 39px apart, so the rims overlap, but each centre still grabs its own handle. The hits stay at the plane’s own size.
- Dragging c keeps the readout on `c = 0` and the phase idle. Release says `animation loading`, near the top of the picture. A drag of 0.8 plays 11 frames at 0.08, 21 at 0.04, 8 at 0.12, and 5 at 0.2, and each one ends on −0.8. The line under the chips names that step. A square at 0.04 is 96 frames and the line is `Each frame, c moves 0.06 (widened from 0.04 for this long drag).` Plus afterwards names 0.08 and keeps those frames. Play again returns to the film and ends on the same c. The c = 0 chip jumps, presses itself, and hides Play again. c = −0.75 and c = i stay pressed on the value they claim. Typing the real part keeps the imaginary part. Shift+Left twice from 0 writes c = −0.2 and does not film. Dragging green moves the walk and leaves c. With reduced motion the readout stays on the start while the button is down, and the release jumps, phase idle, loading line hidden. A touch drag at 390px plays.
- Newton opens as z³ − 1 with that chip pressed. The guess 0.35 + 0.45i reaches the purple root in 5 steps. The four handles are four colours, labeled r1, r2, r3, and z. A rim press on the blue root does not jump it. An empty-plane click does not move a root. Dragging the blue root clears both chips and leaves z³ − 1. The z² − 1 chip hides the third root. ArrowRight on the blue root writes 1.05 and clears the chip. ArrowLeft on the green guess rewrites the readout. Newton paints while the pointer is down. Julia waits for the release and then films. Same handle, two gestures: the basin has to move with the root, and the film is the Julia lesson.
- The colour key follows the station. Julia shows the three-line list and not the Newton list. Newton shows only its own. Test 2 home shows the four-line pair. `#addresses` shows only the Test 1 list, the nav has no Julia, and the next place is Slide, Spin, Stretch, Mirror.
- The film stays. The dashed escape circle stays. Newton’s plain “The Map” link stays: the thread previous is Julia, and the map link is the extra way home. None of those are a broken control.

## Batch 1 review 2 (mid)

Branch `cursor/unify-fractal-ui-fc73`. Verdict: **accept with fixes**.

A student who had used Test 1 would have recognised the header, the badge, the chips, and the readout, and then had nowhere to go with that recognition. The picture was the same site. The ideas were not tied back to it.

### Fixed

- Julia now ends with two cards, the same card the problem index uses, with the teaching colour on the left edge. Powers has the orange edge. The sentence is that z² is one multiplication done twice: turn by the angle, stretch by the length. It cites Howell & Mathews, *Complex Analysis*, Chapter 1, § 4 (the product) and Chapter 1, § 5 (the power repeats it). Slide, Spin, Stretch, Mirror has the blue edge. Adding c is that slide, Chapter 1, § 3. Both links open those Test 1 stations.
- Newton ends with one card, Roots, orange edge. The three roots open on the cube roots of 1, which is c = 1 and n = 3 on that station, Chapter 1, § 5. The sentence above the card says the book colours z³ + 1 and this picture colours z³ − 1, and that line cites Chapter 4, § 2, the same section the header already names for Newton’s method.
- Each station has a Story Map link. A click writes the remembered map back to Test 1 and opens #home: the 21-stop map, Test 1 pressed, Julia out of the menu. The neighbour link called The Map is unchanged. On Julia it is “F1 previous: The Map”. On Newton it is the plain Map link. Both stay on Test 2. That #home is the door for the Test 2 map on `cursor/test2-map-58db`. This branch does not import that branch’s files.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0. Headless Chrome, served as `http://127.0.0.1:8765/math-viz/index.html`. No console errors on Julia, Newton, the Story Map click, Powers, the slide, Roots, or the return to Test 2.
- The page is still Test 1’s page. Title, lede, the F1 badge “F1 · One rule, every starting point”, chips, readout, two panels, and the neighbour links. The rule is still KaTeX. z² and z³ in the new sentences are superscripts. At 1280px the picture stays beside the rule; the cards sit under that pair. At 390px the cards stack and neither page scrolls sideways.
- The four inks are the same tokens. On the picture they still mean what the close review signed: blue stayed or the blue root (`#0b63ad`), orange escaped or the orange root and the c handle (`#a84300`), green the point you drag, purple the third root (`#9d3a8a`). The colour key was not rewritten. The new cards use blue and orange in the Test 1 sense, as the left edge, so the old names sit beside the picture.
- One gesture. Julia’s move is still drag the orange point and let go. Newton’s is still drag a root. The green point is the drag-one-point from Test 1. The cards are reading.
- The powers card border is `rgb(168, 67, 0)`. The slide card is `rgb(11, 99, 173)`. The roots card is `rgb(168, 67, 0)`. The header citation is still Chapter 4, § 2, and it still opens in a new tab. Story Map opens Test 1 with 21 stops. Powers, the slide, and Roots each open on Test 1. F1 previous and Newton’s Map link stay on Test 2, whose home is still the two stops.

### For the builder, in order

1. When the Test 2 map merges, leave these links alone. Story Map must keep forcing Test 1. The Map link must keep opening #home on Test 2, which becomes that map. Do not import that branch’s `book.js` or `test2-ui.js` into these two stations. The citations here are the HTML section numbers: Chapter 1, § 3, § 4, and § 5, and Chapter 4, § 2.
2. Do not split F1 into F2 and F3 on this branch. Those threads belong to the unmerged map. A badge for a thread with no stops here is a costume.
3. The footer key still gives the four inks their picture meanings, and the close review locked those sentences. A later pass can add “same ink as Cartesian” as a clause on an existing line. Do not add a fifth colour, and do not put the Test 1 names back onto the pixels.
4. The book’s colouring figure is Figure 4.2.5, of z³ + 1. The page links the section, not a figure anchor. Pin the figure only after the anchor is checked in the HTML.
5. A copied Story Map URL is just #home, so a new tab keeps whatever map it already remembers. The click is what writes Test 1. Do not replace it with `#home-t1`. That token lights thread T1 and would say this page belongs to the addresses thread.

## Batch 1 review 3 (wide)

Branch `cursor/unify-fractal-ui-fc73`. Verdict: **accept with fixes**.

The close pass asked whether a control was broken. The mid pass asked whether a Test 1 student could find the old move. This pass asks what the eye believes after one look. The pictures were already the right pictures. Three of them were teaching a second object at the same time.

The site, across both tests, is one sentence. Test 1 names a move: a slide, or a turn and a stretch, and a power is that move counted. Test 2 repeats a move from every starting point, and the colour is the fate of that walk. Julia’s fate is stays near 0 or runs away. Newton’s fate is which root the walk finds.

### Fixed

- Julia drew a dashed orange circle at the escape radius, 2. At c = 0 the filled set is the unit disk, which is what the book says in Section 4.2 (K_0 is the closed unit disk, and the Julia set is the unit circle). The dashed circle sat outside the blue, so the first shape on the page was a boundary that is not the set. It is gone. The readout used to say “left the circle” and “still inside,” which named that ruler. It now says the walk ran away, or is still near 0.
- The line under Julia’s chips said “Each frame, c moves 0.08,” in the same panel as z_{n+1} = z_n^2 + c. That reads as the iteration. A walk adds one fixed c. The film is the only thing that moves c, and only from frame to frame. The line now says both. The buttons say “move between frames,” so “step” stays the word for one squaring.
- The Julia lede defined the set as “still nearby when we stop,” which is the 40-step cutoff. The lede now says a start that stays near 0 is blue, a start that runs away leaves the blue, and dragging c makes the blue stop being a disk. The caption names the green walk as one start and the orange point as c, the slide.
- The Newton lede explained the tangent line before it said what the colour is. The colour is now the first sentence: which root the walk finds. The caption no longer ends on black. The opening picture has no black region, and naming it taught a fate that is not on the page. The footer key still has that sentence.
- The slide card opened `#arithmetic`, which opens on multiplication, problem 1.1.1. The eye landed on a product and was told it was looking at the slide. The card now opens `#arithmetic-add`. A mode token no longer keeps the 1.1.1 product strip on top of a different operation. The page opens with z₁ + z₂ pressed, and the problem strip is absent.
- The roots card said “set c = 1 and n = 3.” `#roots` opens on c = 1 and n = 5, the fifth roots, with that chip pressed. The card now opens `#roots-cube`: c = 1, n = 3, three points, and the fifth-root chip stays up. `#roots` itself is unchanged.
- Test 2 home said a point is a place you can start, and never said those moves were already taught. The lede now says the moves are the ones from Test 1, repeated from every starting point, and the colour is what happens. Julia’s stop says the blue disk is every start that stays near 0.
- The Chapter 1 section numbers were already the book’s numbers, not the handout’s. Checked on the open edition, from the contents at https://complexanalysis.org/web/root-1-2-2.html through the section pages. None of the numbers were wrong, so none were renumbered. What was wrong was where the link landed inside the section. § 3’s slide is Figure 1.3.2 (`#fig_ch-01-08`). § 4 opens as polar form and Arg; the product is Identity 1.4.10 and Figure 1.4.13 (`#fig_ch-01-17`). § 5 opens on powers; De Moivre is `#De_Moivre_s_formula`, and the roots of unity are Equation 1.5.5 (`#Roots_of_Unity`), further down. The printed line is still “Chapter 1, § 3”, “§ 4”, or “§ 5”. The header citation is still Chapter 4, § 2, at the top of the section. The Newton note, which is about the book’s colouring, now opens on Figure 4.2.5 (`#fig_ch-04-cp-1`), confirmed in the HTML as Newton’s method for z^3 + 1.

### One observation each station should leave

- **Test 2 home.** A colour is what happens when a move from Test 1 is repeated from the point where you start. The lede says that. The two stops say the two fates: the blue disk is who stays, and a Newton colour is which root the walk reaches.
- **Julia.** Square, then slide by the same c, again and again. Blue stayed near 0. Drag c and that region stops being a disk. The lede, the caption, the stop on the home page, and the paragraph above the cards all say that.
- **Newton.** The colour is which root the walk finds. Drag the green guess and watch it arrive. Drag a root and that colour moves with it. The lede says it first. The card says the three roots are the cube roots of 1, and that the book’s figure is z^3 + 1 while this picture is z^3 − 1.

### Checked and left as is

- `node tools/fractal-smoke.mjs` exits 0, including `#roots-cube`, `#arithmetic-add`, the figure anchors, and the cube-root arrival (n = 3, c = 1). `#roots` still opens on five fifth-roots.
- Headless Chrome, no sideways scroll at 1280px or 390px. Test 2 home shows the new lede and the two stops, with Test 2 pressed. Julia shows the new lede, the film line, and the Powers and slide cards. The slide card’s address is `#arithmetic-add`. Newton’s card address is `#roots-cube`, and the figure link is `#fig_ch-04-cp-1`. On `#roots-cube` the readout is `c = 1; n = 3` and the fifth-root chip is not pressed. On `#arithmetic-add` the pressed chip is z₁ + z₂ and the 1.1.1 strip is not on the page.
- The film, the colour keys, the F1 badge, Story Map, and the Map link were not retouched. Those were locked by the earlier passes, and they were not the wrong lesson.

### For the builder, in order

1. When the Test 2 map merges, keep this home lede. It is the bridge from Test 1. Do not put topic chips back in front of the two stops.
2. `#roots-cube` still opens a Test 1 page whose first words are the staircase, then “No review problem matches,” then “Three things to try.” The three points are the picture under that. If Roots is edited, let this token open on the root picture.
3. Powers still opens at n = 10. The card says the move is one point, repeated, and that picture is that. Do not retarget the card to n = 2.
4. Pixels outside the disk are still painted by how soon the walk left. The sentences now say stayed or ran away. Do not add a speed legend.
5. The film still holds the old picture until the pointer is up. The line under the chips now separates the film from the walk. Leave the gesture.
6. Leave the footer colour keys as the close review locked them. The lede no longer needs the key to carry the observation.
7. Do not merge. Do not split F1. Do not import the unmerged map’s files.

## Batch 2

Branch `cursor/unify-fractal-ui-fc73`. The ranked lists from the three reviews, and what this batch did with each.

### Mid review, for the builder

1. Left the links alone. Story Map still writes Test 1 and opens `#home`. The Map link still opens `#home` on Test 2. Neither station imports `book.js` or `test2-ui.js`. The printed citations are still Chapter 1, § 3, § 4, and § 5, and Chapter 4, § 2.
2. F1 is still the only fractal thread on this branch.
3. Skipped the “same ink as Cartesian” clause. The wide review’s item 6 locks the footer keys, and the lede is what carries the observation. A fifth colour was not added. Test 1 names are not on the pixels.
4. Already done by the wide review. Newton’s note opens on Figure 4.2.5, `#fig_ch-04-cp-1`. Not moved.
5. Story Map stays `#home` plus a click that writes Test 1. It is not `#home-t1`.

### Wide review, for the builder

1. Skipped. The wide review said to keep the Test 2 home lede. Shael’s merge note overrides that: PR #5 (`cursor/test2-map-58db`) wins `js/stations/home-test2.js`, and this PR wins `js/stations/julia.js` and `js/stations/newton.js`. This batch does not edit the home file. The wide reviewer’s lede is still the one on this branch, and it should be dropped at merge. See the conflict lines below.
2. Done, and only for this token. `#roots-cube` scrolls to “The n roots of c” after layout, so the three points are the picture on screen. The staircase, “No review problem matches”, and “Three things to try” stay above it. `#roots` still opens at the top, on five fifth-roots.
3. Powers stays at n = 10. The card was not retargeted.
4. No speed legend. Outside pixels are still painted by escape time. The sentences say stayed or ran away.
5. The film still holds the old picture until the pointer is up. The step line is unchanged.
6. Footer colour keys are unchanged.
7. Not merged. F1 is not split. The unmerged map’s files are not imported.

### The one observation

Julia’s lede is now only “Square, then slide by the same c. Blue stayed near 0.” The filled-set definition and the second fate sentence left the lede. The drag, and “the blue region stops being a disk”, sit in the caption under the picture, which is where the drag happens. Newton’s lede is now only “The colour is which root the walk finds.” The tangent step stays in the rule panel. The caption still names the three roots and the green guess.

### Home page: what will conflict with PR #5

Take PR #5’s `js/stations/home-test2.js` for the whole file. Do not keep any line from this branch.

Merge base is `5b111e9`. On that base the file is 71 lines. This branch changes two strings and nothing else:

- Line 21, `STOP_TEXT.julia`. Base: `Leave c at 0 and see the disk. Then drag c until the disk is no longer a disk, and say what c is.` This branch: `Leave c at 0. The blue disk is every start that stays near 0. Drag c until that region is no longer a disk, and say what c is.`
- Lines 52–53, the `station-lede`. Base: `Two pictures. A point is a place you can start. The colour says what one rule does if you start there. Drag the rule and the colours move.` This branch: `Two pictures. The moves are the ones from Test 1, repeated from every starting point. The colour says what happens. Drag the rule and the colours move.`

Line 22, `STOP_TEXT.newton`, is the same as the base. PR #5 deletes `STOP_TEXT`.

PR #5 replaces the file from line 1. Its lede is lines 213–214, `p.station-lede.home-thesis#home-thesis`: `A colour is the fate of repeating one motion. … The colour is where the walk ends.` It also imports `js/data/book.js` and `js/stations/test2-ui.js`, which this branch does not have. A line-by-line merge of the 71-line file against that rewrite will conflict on the whole file. Resolve it by taking PR #5’s file. `julia.js`, `newton.js`, `js/core/fractal-station.js`, and `js/data/textbook.js` stay with this PR.