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

## Kit batch 1 review 1 (close)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: does the kit run, and do the skill, the scaffold, and the tool schema describe the same thing? Verdict: **accept with fixes**.

### Fixed

- Answers are `{ tex, text, values }`. The scaffold rejects a string and rejects `answerText`. Smoke recomputes the six example answers, including a finite-difference check that the Cauchy-Riemann equations hold for `e^z`. The card still shows the TeX and the plain line.
- A station may have at most three preset chips. The addresses picture keeps its three (the exercise point, `1 + i`, and `−1` on the seam). A fourth chip fails the scaffold and the schema.
- The phone width is 360px. Smoke checks the map and the picture at that width. Both stay inside the viewport.
- The example cites Howell & Mathews, *Complex Analysis* (HTML and PDF, CC BY 4.0) at confidence 0.9. Sections 2.1–2.5 and 3.1–3.2 use the book's titles and the live section URLs. Test 2 cites §4.2, and the Julia note also names §4.1. Chapter 1 keeps the handout's section titles, and every such tag says the book's chapter 1 is numbered differently. Exercise numbers stay the handout's, with a note that they are not confirmed book numbers.
- `kit/mcp-tool.json` is a draft 2020-12 schema. Strict Ajv compiles it, and the example config validates. A problem source must include an exercise. A `viz` station must name a built-in picture. Palette keys are the theme tokens, and the values are hex. Snake_case keys in the config's `loop` fail validation.
- `kit/SKILL.md` now states the loop as one sequence: builder batches of 2 to 4 rounds, then close, then mid, then wide, then up to 3 reframe rounds. Each reframe round is independent reframers, one rebuttal each, then a council. The next round does not start until that choice has been built and has passed close, mid, and wide. Source tags stay on the map, the stations, the cards, the problems, and the pitches.

### Decisions

- The book is cited. The stop-and-ask rule stays. A missing, `TODO`, or placeholder title still exits 2. Confidence 0.9 is a note on this course, not permission to invent a book for the next one. A confidence below 1 with no note fails validation. It does not exit 2.
- Chapter 1 is not remapped onto Howell & Mathews 1.2–1.6. Those titles do not line up with the handout, and invented section numbers would be a false citation.
- §4.1 is named on the Test 2 map, in the chapter list, and on the Julia source tag. No new sequences station was added in this pass. A new station is a later batch.
- The three address chips stay. Cutting one would hide the seam the page asks the learner to watch.
- The independent draft's answer shape, the three-control ceiling, the 360px rule, the "solve it yourself" rule, and the pair of book URLs are in the kit. Its other architecture is not: per-test data files, Three.js, a taste-tester loop, and a different colour set. This kit's station contract, four teaching colours, and close / mid / wide plus reframers stay the source of truth.
- The tool file's top-level `loop` stays snake_case. The config's `loop` stays camelCase. The skill says that once, in both the loop section and the invoke section.
- The practice card still renders a string answer if a generated file is hand-edited, so the page does not go blank. The scaffold will not write that shape.
- Drag films are not part of the built-in pictures. The dot is the gesture. Reduced motion stays the CSS rule the template already has.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets under `/math-viz/`.
- `node kit/scaffold.mjs --config kit/study-site.config.example.json --out /tmp/study-site-cli` writes 24 stations, 8 flashcards, and 6 problems.
- A fresh one-map config scaffolds from the CLI. A title of `TODO` exits 2 and tells the agent to ask.
- Ajv 8 in strict mode compiles `inputSchema`. The example matches. A missing exercise, a string answer, a fourth preset, a viz station with no picture, a missing textbook title, and a snake_case loop key are all rejected.

## Kit batch 1 review 2 (mid)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: would a site this kit generates feel like the live Test 1 map, or like a generic template, and could another agent reach that bar from `kit/SKILL.md` alone? Verdict: **accept with fixes**.

The shell is the real site. The example site is not. Of 24 stations, 20 are `kind: reading`. The only picture is the two-address plane. Julia and Newton, which are the live Test 2 gestures, are paragraphs that tell the learner to drag a handle that is not on the page. Scaffolding the example produces a cited syllabus in the right header. That is a generic template. The close pass was right that it runs. A learner would not mistake it for Test 1.

### Fixed

- Thread colours and shapes no longer depend on the ids T1, T2, T3, and F1. A thread uses `tone` and `mark`. The template CSS had been forcing any thread named T2 to orange and dashed, and any thread named T3 or F1 to purple, whatever the config said. The dead Test 1 / Test 2 colour-key rules are gone. The key for the page is the one list the router fills. A seam entry is a dashed stroke. A ramp entry stays a gradient.
- `#home-<threadId>` opens the map that thread belongs to and dims every stop it does not cross. The legend links are those hashes. A thread that does not earn a line does not light. `#home` still leaves the remembered map alone.
- A stop that owns an exercise gets a dot on the story map. The dot opens `#problem-<id>`.
- The number line honours preset chips, draws them as orange ticks, and keeps a chip pressed only while the value matches. The exercise sits on that picture, including when the problem names the station and the station does not repeat the id.
- A flashcard links to the station it drills, on the front and the back. The Test 1 deck no longer shows the Julia card. Practice lists only the problems whose station is on the current map, and each card names that station and its threads.
- `kind: reading` is an unfinished placeholder. The scaffold still exits 0 and now prints the list. The example prints 20 names, including `julia` and `newton`. The skill says a batch is not done while that list is non-empty, and that copying those stations onto a new course is how you get a syllabus instead of Test 1.
- The tool description leads with the call. Required fields, do not call without a real book, `visualization` is only `two-addresses` or `number-line`, `reading` is not a finished stop, colour-key words are this course's words, config `loop` is camelCase. The call writes a folder. It does not draw custom pictures or run the reviewers.
- A route change marks the view `loading` before the next station mounts, so a previous `ready` cannot satisfy a wait for the new hash.

### Dry run

A Calculus I slice, written from the skill rather than from the example, scaffolds clean: OpenStax *Calculus Volume 1*, §2.2, exercise 31, confidence 1 because that exercise was read on the publisher page. One throughline, two threads that each skip a stop, a number line with chips at 0.9, 1, and 1.1, one flashcard linked to that station, one problem whose answer was recomputed (`f(0.9) = -1.9`, `f(1.1) = 2.1`, one-sided limits `-2` and `2`). Storage prefix `calc1:`. Zero reading stops. `node kit/scaffold.mjs` does not print an unfinished list.

That slice is the right shape and the wrong picture for the sentence. The number line shows x. The sentence is about f(x). The skill now says so: three chips are the build-up only when the sentence is about the dot. A limit, a tangent, or a shaded area is a custom station. `two-addresses` stays a complex-analysis picture. It talks about Arg. A linear-algebra course does not call it.

### Decisions

- The example config stays the citation shape for this repo's course. Its 20 reading stations are not promoted into pictures in this pass. Those pictures already live in `js/stations/` on the live site. Folding them into the kit would tie the kit to complex analysis, which is the failure this pass is trying to stop.
- The reading page still does not apologise. It also does not count as done. Both can be true: the page is quiet, and the batch is open.
- The home page in the kit remains the map. It does not gain the live home's finder or the draggable dot. Those are the next builder's, and they are below the unfinished pictures.
- Practice cards name the place and the threads in the open. They do not gain the live site's predict-first hide of place, address, and aha. That is taste, and it waits until the pictures exist.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets under `/math-viz/`.
- `#home-t2` is Test 1, the map's focus is T2, the staircase stays lit, arithmetic dims, the T2 legend link is current, and the map dot for exercise 1.3.1 is present.
- The Test 1 deck is 7 cards and links to One Point, Two Addresses. The Julia card is not in it.
- A one-map number line, served beside the example, presses the chip at 1, releases the chip at 1/2, and shows exercise 1 on the picture.
- At 360px the map and the address picture do not scroll sideways.
- The example still reports 20 unfinished reading stops. The Calculus I config reports none.

### For the builder, in this order

1. **Stop shipping the example as a finished site.** Twenty stops describe a gesture the page cannot perform: staircase, roots, mappings, derivative, Julia, Newton, and the rest of the reading list. Port the gesture from `js/stations/` or cut the stop. Do not add another reading page. One batch is 2 to 4 of those pictures, each with its exercise still on the page and its source tag unchanged.
2. **A sentence about the output needs a picture of the output.** The number line cannot carry a limit or a derivative. The next reusable picture, if the kit grows one, is one graph, one draggable x, the value in purple, and at most three presets. Until then those stations are `custom` modules. Do not describe `two-addresses` as a generic two-readings widget. It is the Arg picture.
3. **The generated home is a map, not a lesson.** The live home is a finder, one dot with both addresses, and the map. The kit now lights a thread and marks exercises. It still does not teach from the front page. Add the finder only when a map has enough stops that the chips are not the finder. Do not put a second control on that dot.
4. **Leave the predict-first card ritual and the 7-column rounded map until the pictures exist.** The cards already cite chapter, section, and exercise, and they name their station. The straight 4-column map is readable. Neither gap is why a generated course feels generic. The reading pages are.
