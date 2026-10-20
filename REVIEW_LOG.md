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

## Kit batch 1 review 3 (wide)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: what a generated site makes a learner look at, and what the skill makes the generating agent look at. Verdict: **accept with fixes**.

The teaching recipe is the right one. One gesture, a sentence that is true of this state and false of another, one throughline, threads that earn a line, four colours, source tags, the exercise on the picture. That is a study site. The production recipe was aimed at the wrong observer. `kit/SKILL.md` spends its length on fields, citations, the shell, and the review loop. The only generative tool writes JSON. A custom module was a path string, and `--force` deleted the output, so the only artifact that survived a round was the config. An agent following the skill to the letter fills `observe` and moves on. The calculus dry run in the mid pass is the evidence: the shape was right, and the picture was a number line for a sentence about f(x).

A night on the example leaves a learner believing the course is a cited list. They can recite "one point, two addresses." They have dragged one dot. The other twenty stops tell them to watch a staircase, a grid, or a root that is not on the page. Flashcards ask them to say a sentence and then show the sentence. Nothing in that night can be wrong in a way the picture corrects, except on the address plane. The throughline stays a lede.

The loop then reviews that. Close checks that the shell runs. Mid checks that it feels like the reference. Wide asks what the learner saw. A reframe on top of twenty reading titles reorganises a syllabus. The surprise the loop asks for, a new picture of the whole course, cannot be built with the tools the loop hands back.

### Fixed

- A custom picture lives in `stations/<id>.js` beside the config. Scaffold copies it to `js/stations/<id>.js` on every run, including `--force`. An edit made only in the output folder is discarded, and smoke checks that the source comes back. A module path with no file is an error. The path has to be `./stations/<id>.js`.
- `node kit/stamp-station.mjs --id <id> --config <config>` writes that file: header, source tag, footer, one canvas, one pointer, at most three chips, and `drawLesson`. The green dot is there so the page loads. It is not the lesson. While the file exports `STAMP_OPEN`, scaffold names it and exits 0, same as a reading stop. The page does not apologise.
- The skill now opens on the picture. Four lines go in `RESEARCH_LOG.md` before a teaching row exists: the hand's one move, the mark that moves, the sentence that changes, and which picture draws it. A reframe does not start while scaffold still prints unfinished stops. When it does start, the question is which motion makes the throughline obvious.

### Decisions

- The recipe stays. Gesture, observe, throughline, threads, connective layer, and source tags are the abstraction for one course in one site. What was wrong is the order. The config is the index of pictures. It is not the work.
- Do not port `js/stations/` into the kit. The mid pass was right that those pictures are this course. A library for any course is a few gestures used as data: the number line and the address plane that already exist, one graph (drag x, the value is purple), and one action on a shape (a vector, or a 2×2 on a square). The stamp is the escape hatch for the picture those four do not draw, not the normal path.
- The example's twenty reading stops stay unfinished. Promoting them was the mid pass's job to refuse, and it still is. The reframe gate applies to them. A council that rearranges those titles is a new syllabus. It does not start. The next builder batch draws 2 to 4 pictures. Close, mid, and wide run on that batch. Only then does a reframe round open, and only about a motion the learner can drag.
- The stamp's default dot is allowed to load and forbidden to ship. Deleting `STAMP_OPEN` without changing `drawLesson` is how the next agent cheats. Reviewers treat a green dot plus a static sentence as unfinished.
- Threads, the colour key, cards, and practice stay where the mid pass left them. They are how a picture joins the course. They are not a substitute for one.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets under `/math-viz/`.
- A custom station with no file beside the config is refused. So is a module path that is not `./stations/<id>.js`, and a stamp of the shell name `reading`.
- Stamping `secant` writes `STAMP_OPEN` and `drawLesson`. A second stamp without `--force` refuses. Scaffold copies the file. Replacing the copy and running `--force` restores the source.
- The stamped page presses the chip at 1, releases the chip at 1/2, and the readout follows. The page text does not say unfinished. At 360px that picture does not scroll sideways.
- The example still reports its reading stops. The fresh one-map sample still has none.

### For the builder, in this order

The mid pass's list still stands: draw or cut the reading stops, do not teach an output with a picture of the input, leave the finder and the predict-first card until the pictures exist. Do that work inside the three decisions above.

1. **Add two course-agnostic pictures, then stop.** One graph: a green x, a purple value, orange ticks at the presets, the sentence about the value. One action on a shape: drag a vector, or let one 2×2 act on a square, and the sentence names what changed. Same contract as the number line: at most three chips, the exercise on the page, the colour key of that map. Do not import Julia, Newton, or the rest of `js/stations/`. A limit, a tangent, and a linear map are the first users. A number line for any of those is a failed round.
2. **Draw the example in batches of 2 to 4 of those pictures, or cut the stop.** Stamp only when the library cannot say it. Fill `drawLesson` until the sentence is false of some other state, then delete `STAMP_OPEN`. Keep the file beside the config. The addresses plane is already a picture. The next batch is the next motion the throughline needs, not the next section in the book.
3. **Do not open a reframe on this map yet.** Scaffold still prints unfinished stops. A pitch about a new metaphor for those titles is the syllabus failure this pass is closing. After a batch of pictures has passed close, mid, and wide, the reframe question is fixed: which single motion, dragged for an evening, makes "one point, two addresses" obvious, and which stops are sentences about a motion the page still does not show?

## Kit batch 2 review 1 (close)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: do the new controls work and feel right — drag, chips, keyboard, touch, 360px — and is each sentence true where the picture says it is? Verdict: **accept with fixes**.

The four gestures are real controls. A graph drags x and paints the output purple. A shape applies one 2×2 to a square. Roots is a custom module beside the config, three chips, equal gaps. The home is a finder and one dot, and a calculus home is a line. Smoke drives them in headless Chrome, including a finger drag and a 360px window. Sixteen reading stops are still unfinished. That list is the next batch. It is not a reason to reopen these pictures, and it is not a reframe.

### Fixed

- The mappings square used to sit on the origin. A quarter turn and a half turn of a centered square are the same set of points, so ×1, ×i, and ×−1 drew the same picture while the sentence said the square had turned. The square now sits in the first quadrant and one corner is marked, on every shape station. The purple image is filled. The green square is dashed and drawn on top, so identity still shows both. Smoke hashes the canvas: ×i and ×1 are different pictures.
- The shape hand was the whole canvas, so a press on the square jumped the parameter. The hand is the track. A press on the square does nothing. A press on the handle keeps t until the pointer moves 4px, then it follows. Smoke checks both.
- `imageIsSquare` used a tolerance of 0.08, and the derivative claim used 0.15 for "near". One arrow from the turn chip (t = 0.05) was still called a square, and a degree or two off ×i was still "multiplication by i". The square test is now 0.02 on both the side ratio and the angle. The mappings claim tolerance is 0.02. One ArrowRight from the turn chip reads smear. One ArrowRight from ×i reads "not multiplication by i", and the chip unpresses. The between chip (t = 0.35) was already a smear under either tolerance.
- The home dot for −1 + i√3 was clipped. The old frame was width/8 on a 5/2 picture, so the vertical range was about ±1.6 and 1.73 sat above the canvas. The frame is now ±2.5 on the short side. Smoke finds the green pixels inside the canvas, not on the edge.
- The seam sentence used to claim the point was on the cut for a band of |im| < 0.15, and it hid the angle, so you could not see the jump. The band is now re < −0.05 and |im| ≤ 0.04, and the readout always prints the angle. A click on the negative axis reads angle = 3.14 and the jump sentence. A click just below reads a negative angle and the ordinary sentence.
- The finder had no keyboard. ArrowDown selects the first match and Enter opens it. The selected row uses the same background as hover. The heading is "Find a stop or a problem".
- The line home had no arrow keys and no claim. Arrow keys move x. `viz.claim` with `gt` / `lt` / `eq` flips the sentence. A calculus home starts at x = 1 ("x is positive") and nine ArrowLefts cross into "x is not positive". The readout has no angle.
- The instruction under a graph, a shape, the roots, and the home dot was a hardcoded line, so the config's `observe` never appeared. Those lines now use `station.observe`. The flipping sentence stays `viz.claim`. The skill's picture-first list used to tell the next agent that `observe` is the sentence that flips. It now says `observe` is the instruction and `viz.claim` is the sentence that has to be false somewhere.
- "Exercise 2.1.1" on the mappings page, next to the real §2.1 URL, was a false citation. In Howell & Mathews, (2.1.1) is the equation f = u + iv. The section's exercises are numbered 1, 2, 3. Exercise 1 is a different problem. Example 2.1.11 is multiplication by i, which is what the picture shows. The tag now says "handout 2.1.1" and the note says it is not a book exercise. The staircase note names book Arg as §1.4 Definition 1.4.6. The roots note names the nth roots of unity as §1.5 equation (1.5.5). The derivative note names equation (3.1.1) and does not invent an exercise number. Chapter 1 section numbers stay the handout's. That was the batch 1 decision, and the book still does not line up.
- Long source notes could force a sideways scroll. The note wraps anywhere. At 360px the home, the address plane, the staircase, mappings, roots, the derivative, the calculus graph, and a stamped picture all stay inside the viewport.

### Decisions

- Graph drag is the whole canvas. Shape drag is the track. x is the horizontal coordinate, so the plot is the control. The square is the thing being transformed, so grabbing it must not set t.
- Roots stays three chips and no slider. The gesture is a count. Tab reaches the buttons. An arrow key on that canvas would pretend the count is continuous.
- The staircase claim "Arg is still positive" is true on [2, 4.2] and only there. One wrap, one crossing of π. Widening that domain would make the sentence lie, because Arg is positive again after the next turn. The domain stays.
- The derivative sentence "that is what a derivative looks like" is a reading of the limit in equation (3.1.1): one complex multiplier is a turn and a stretch, and a shear is not. The section does not use those words. The note says so. I did not invent a theorem number.
- The mappings picture is the quarter turn in the hint, not the expansion of z² + iz. The summary on the page already says that. Relabeling it as book exercise 3 would cite a different problem (z³, conjugate, 1/z²). The handout id stays, marked as a handout.
- Calculus I is a smoke fixture, not a second committed course. It is OpenStax Calculus Volume 1, §1.1 Review of Functions, exercise 8: f(x) = 4x² − 3x + 1, the polynomial the graph can draw. f(0) = 1, f(1) = 2, f(3) = 28. The claim is "the output is above 1", which is false at the f(0) chip and true at f(1). It does not say "you are at x = 1", because y = 2 also at x = −0.25. §2.2 exercise 31 is a limit of (x² − 1)/|x − 1|. The graph cannot draw that. The home is a line with a claim on x, not a complex plane. Storage prefix `calc1:`.
- The 4-column serpentine map and the predict-first cards stay where the earlier reviews left them. Layout consistency here means the kit shell: header, chips, source tag, plane frame, the four colours, 360px. The live home's seven columns are this course. They are not the kit.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets.
- Home: green pixels of the start dot sit inside the canvas. The negative axis and a point just below it disagree about the jump sentence and about the sign of the angle. Finder ArrowDown selects `#roots` and Enter opens it.
- Mappings: canvas hash changes from ×i to ×1. A click in the middle of the square leaves t = 0. An off-center handle press does not move t. A real drag leaves the ×i chip. One ArrowRight from ×i drops the true sentence.
- Staircase: the after-π chip reads a negative value and "jumped". The before-π chip reads "agree". One ArrowRight unpresses that chip and the sentence still agrees.
- Roots: five gaps, the 1.4.1 tag, and four gaps are "not five".
- Derivative: the turn chip is a square, the shear chip is a smear, one ArrowRight from the turn is a smear.
- Calculus page: f(1) reads 2.000 and "above 1", f(0) reads 1.000 and "not above 1", f(3) reads 28.000, exercise 8 is on the page. The graph canvas has `touch-action: none`. The line home has no angle. Arrow keys flip the sign sentence.
- A finger drag on the staircase moves x to the right end of the domain. At 360px none of the new pictures scroll sideways.
- Scaffold of that calculus config writes a graph and no `two-addresses` station, recomputes exercise 8, and prints no reading stop. The example still lists the unfinished reading stops, and staircase, roots, mappings, and derivative are not on that list.

### Ranked

1. **A centered square made the quarter turn invisible.** That was the control bug. Fixed. A shape station that draws a square on the origin will lie again. The first-quadrant square with a marked corner is the picture, not a mappings special case.
2. **The home dot was off the canvas, and the seam sentence fired when the angle had not jumped.** Fixed. The angle stays in the readout so the jump can be checked.
3. **"Exercise 2.1.1" next to the book URL was false.** Fixed by naming the handout and saying (2.1.1) is an equation. Chapter 1 numbers stay the handout's, with notes that point at book §1.4 and §1.5. Do not remap them.
4. **Loose tolerances made the derivative and the quarter turn agree with the wrong picture.** Fixed at 0.02. A claim that is true a tenth of the way toward the counterexample is a slogan.
5. **The line home and the finder were mouse-only.** Fixed. Arrow keys move the line. ArrowDown and Enter run the finder.
6. **Sixteen reading stops are still paragraphs about a gesture that is not on the page.** Julia and Newton are on that list. Do not port `js/stations/`. Draw the next 2 to 4 with graph, shape, or a stamped `stations/<id>.js`, or cut them. Do not open a reframe while that list is non-empty.
7. **The mappings page shows the turn in the hint, not u + iv for z² + iz.** The sentence on the page is true of the turn. It is not a picture of the expansion. Leave it until a station can show both addresses of that polynomial. Do not cite it as a book exercise to paper over that.

## Kit batch 2 review 2 (mid)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: integration and reuse. A fresh agent with only `kit/SKILL.md`, `kit/mcp-tool.json`, and the kit files, building a different course. Verdict: **accept with fixes**.

The course is intro linear algebra. The book is David Austin, *Understanding Linear Algebra*, §2.6, read on the HTML edition. Activity 2.6.3 asks what four matrices do to the plane: a horizontal stretch, a dilation, a clockwise quarter turn, and a shear. The activity workbook is CC BY 4.0. The section page did not show its own licence line, so the prompts are paraphrased and confidence is 0.95. That slice is now `kit/examples/linear-algebra.config.json`. The generated site is not committed.

It is the same family as Test 1, at the size of one batch. Finder, one gesture, a sentence that is false on another chip, two threads that each skip a stop, source tags, cards that link to the station, practice with the hint closed. The shell, the four colours, and the map are the live site's. It is not the live site's twenty-one doors. Those extra doors were paragraphs. A first batch should not pretend to be the whole course.

The sixteen reading stops do not serve the kit. The deliverable is the skill and the scaffold. The example is what the next agent copies. A config whose majority of stops describe a gesture the page cannot perform teaches a syllabus. I cut them. The example is now the pictured slice: the address plane, the argument graph, the roots, the quarter turn, and the derivative, plus the map, four cards, and three problems. Julia and Newton are not in it. Test 2 is not in it. Do not put those stops back as reading rows to keep a second map. A second map earns its place when both maps have pictures.

### Fixed

- `stretch` was `[[t, 0], [0, t]]`. Activity 2.6.3's first matrix is `[[2, 0], [0, 1]]`. An agent who followed "use stretch" drew a dilation and had no action left for the horizontal stretch, which is the picture the section opens on. `stretch-x` is that matrix's family. `image-square` is true at `t = 1` and false at `t = 2`.
- `image-square` stays true for every rotation and for every uniform stretch that has not collapsed. The skill used to offer it as the shape claim. On those two actions it is a slogan. The skill now says `near` for them, `image-square` for shear and `stretch-x`, and `det-positive` for a reflection, which is still a square. A reflection or a projection is `samples`, not a reading row.
- The readout said `smear` on every course. That word is the derivative's claim, not the picture's. The readout now says `square` or `not a square`, and it prints the determinant and the marked corner. A quarter turn stays a square, and the corner is the mark that moves: `(1.15, 0.2)` goes to `(0.2, -1.15)`. The derivative's claim still says smear.
- A shape-only course opened on a number line. The home picture is now `point`, `line`, or `shape`. Unset still picks the point when the site has `two-addresses`, the square when the only pictures are `shape`, and the line otherwise. The linear-algebra home is a shear with no chips. One arrow key takes it off the square. Calculus stays a line. The example stays the complex point.
- The axes on a shape were the muted text colour, so blue was a footer sentence with nothing on the canvas. They are blue. The linear-algebra key can say blue is the plane without lying.
- A thread line ran through every stop between its first and last member, including stops the thread does not teach. It now visits the members. `#home-t2` still lights the staircase and dims mappings, and the path's stop list does not contain mappings. The axes thread on the linear-algebra map does not contain the quarter turn.
- The skill said both "stop and ask for the textbook" and "decide, do not ask", and it described a finished slice as one picture while a batch is 2 to 4. If the task names the course and says to pick a free book, cite the page you read. A batch is 2 to 4 pictured stations. Leave the next section out until it has a picture. The example is that kind of slice, and `kit/examples/linear-algebra.config.json` is the other one.

### Decisions

- The example is one map. The two-map switch stays in the template. Restoring Test 2 as Julia and Newton paragraphs would put the syllabus back. Smoke no longer clicks a second map. `#home-t2` still forces the map that owns the thread.
- Topic chips stay hidden under six concepts. The slice has four. I did not invent two topics to look like the live home. The finder is the finder.
- The corner in the linear-algebra answers is the kit square's marked corner, `(1.15, 0.2)`, not a point from the book. The note says so. The matrices are the activity's.
- The derivative claim keeps the word smear. That sentence is about a complex derivative. The readout is not.
- No reframe on this pass. The example no longer prints unfinished stops, so the gate is open for a later round. This pass is the mid review of the batch that drew the four gestures. Wide has not run.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets.
- The example scaffolds eight stations and prints no reading list. The deck is 4. Practice is 3. The worked answer is exercise 1.3.1. The home is still the complex point, the angle still jumps on the cut, and one key off the derivative's turn is not a square.
- The linear-algebra config scaffolds four shape stations and no reading stop. Home is "The square", no chips, det 1, and one ArrowRight shears it. The double-x chip is not a square and det is 2. The dilation by 2 is still a square and det is 4. The clockwise chip reads corner `(0.200, -1.150)`. The shear reads corner `(1.350, 0.200)`, det 1, not a square. The first card links to `#wide`. Practice lists four exercises. At 360px the home and the stretch do not scroll sideways.
- A shape-only home with no `viz.picture` resolves to `shape`. A site that also has a graph stays a line. A site with `two-addresses` stays a point.

### Ranked

1. **The example was a syllabus with five pictures attached.** That is what a fresh agent copies. Cut. The kit's example is the pictured slice. The other MAT 412 pictures stay on the reference site.
2. **`stretch` could not draw the first linear-algebra picture, and `image-square` was a slogan on a rotation.** Fixed with `stretch-x`, `near`, and the corner in the readout. A claim that is true on every chip of the action is not a claim.
3. **A matrix course opened on a number line, and blue was not on the shape.** Fixed. The home picture follows the throughline. The axes are blue so the colour key can tell the truth.
4. **The thread line visited stops the thread skipped.** Fixed. A line through every door is the map order drawn twice.
5. **The skill told the agent to stop and ask, and also to ship one picture, while the loop asked for a batch.** Fixed in the skill and the tool description. Pick the free book, read the section, build 2 to 4 pictures, leave the rest out.
6. **Reflection and projection are still not actions.** They do not need to be. `samples` plus `det-positive` or `image-square` draws them. A reading row for either is the failure this pass is closing. The first batch stops at the four matrices the activity opens with.
