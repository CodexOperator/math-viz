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
