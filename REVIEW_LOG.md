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
