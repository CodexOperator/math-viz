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
