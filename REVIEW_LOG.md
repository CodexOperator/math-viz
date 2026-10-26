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

## Kit batch 2 review 3 (wide)

Branch `cursor/study-site-skill-6486`, draft PR 4. Zoom: step all the way back. Is `kit/SKILL.md` the skill that lets any agent build a study site, and is it ready to save? Verdict: **accept with fixes**. Call: **READY**.

The generating agent was still looking at the form. Picture-first was the opening, and then the same contract was copied until the copies drifted: the field table called `observe` the sentence the learner looks at, one sentence forgot `det-positive`, and the stamp, which is the file an agent stares at for any picture the four gestures do not draw, put `observe` in the sentence that is supposed to flip. A faithful agent filled the instruction and moved on. The linear-algebra dry run is the evidence that the library works when the course is a square. The stamp was the evidence that any other course was handed the old confusion.

The learner on the linear-algebra site watches the square. One drag, the sentence flips, the readout names the corner and the determinant, the card sends them back to the drag, the hint stays closed. That is a study site: test study, flashcards, questions, a picture, and the build-up as two or three chips of the same gesture.

The learner on the example never reads `throughline`. The home shows the lede, which is the door: one point, two addresses, then the three threads. The dot's calm sentence is the two addresses, and the cut flips it. The staircase shows the name jump. Roots makes them count gaps. Mappings asks whether this turn is multiplication by i. The derivative asks whether the image is still a square. Five true sentences. The field that was supposed to hold them together was four sentences and three ideas, and it was not on the page.

Nothing left blocks saving the skill. The loop can be run by an agent who has not seen this review. A batch is 2 to 4 pictured rounds. Then close, then mid, then wide, each a separate pass that starts from the log and the running site. Close opens the cited page and checks chapter, section, and exercise. Wide names the throughline in one sentence and the mark that moves. Then at most 3 reframe rounds. Each reframer is a separate pass that receives the site, the throughline, and the question. A single agent writes each pitch to its own file and does not open the others until all three exist, and does not revise an earlier pitch after reading a later one. One rebuttal each. The council picks one pitch or a synthesis, writes the reason, and does not offer a menu. The next builder batch prototypes that choice. Close, mid, and wide run again before another reframe. A reframe does not start while scaffold still lists a reading stop or a `STAMP_OPEN` file. The only question for the user is a textbook the task did not tell you to choose and that you cannot find a page for.

`kit/mcp-tool.json` matches that procedure. The description and the schema call `observe` the instruction and `viz.claim` the sentence that flips. A flashcard requires `station`. Shape `action` and `samples` are exclusive. Config `loop` stays camelCase (`reframeRounds`, `reframers`). The file's top-level `loop` is the procedure, including independence, one rebuttal, the council, and citations. There is no server in the repo. Running the tool means writing the config and running `node kit/scaffold.mjs`.

### Fixed

- The skill opens on the two observers. The agent looks at the picture, the claim, the citation, and the loop, in that order. The learner sees a mark move and a sentence change. A field that does not change that view is not the work. `observe` is the instruction. `viz.claim` is the sentence that has to be false somewhere. The throughline is one idea, in one or two sentences, and the home picture is where one drag makes it false.
- The stamp's muted line is `station.observe`. The flipping sentence is `viz.claim`, or `viz.sentence` until a claim exists. `observe` is not copied into that sentence. Smoke checks both strings on the stamped page.
- Close now says to open the cited page. A tag that only matches the config can still be a false citation. A handout number stays, and the note names the book's number. Reframers have a mechanism: separate passes, or separate files before anyone reads a pitch. The council's choice is prototyped by the next batch, then reviewed, before another reframe.
- A flashcard, a problem, and a concept need a station that exists. The schema requires `station` on a card. Scaffold rejects a card that omits it.
- The example throughline is one sentence: watch one motion and name the address that makes it obvious. The lede is unchanged. It is the door the learner actually reads.

### Decisions

- **READY.** Save `kit/SKILL.md` and `kit/mcp-tool.json` as the reusable skill and the tool definition. Later batches improve a saved skill. They are not a reason to keep it in draft as a procedure.
- The example stays five pictured stops. Roots still makes the learner count. The count is how many addresses fit on one full turn, and the sentence is false at four and at six, so the stop stays inside the one idea. Cutting it is a reframe. The gate is open. This pass does not open the round.
- Mappings stays the quarter turn in the hint. The sentence on the page is true of that turn. A picture of z² + iz is a later station, when a picture can show both addresses of that polynomial. Do not cite it as a book exercise.
- Reflection and projection stay `samples`. A named action for either is a later batch. A reading row for either is still the failure the mid pass closed.
- The four gestures plus a stamp are the library for any course. The stamp does not draw the lesson. It stops the agent from shipping a syllabus or from putting the instruction in the claim. Beauty past that contract is the agent's `drawLesson`, reviewed by close, mid, and wide.

### Checked

- `node kit/smoke.mjs` exits 0. Headless Chrome, no console errors, no failed assets.
- The stamped page's instruction is "Watch the mark the hand changes." The sentence under it is "The dot is only the hand." The stamp source has `claimText` and does not fall back from `viz.sentence` to `observe`.
- A flashcard with no station is rejected.
- The example still has no reading stop. The linear-algebra config still scaffolds four shape stations. The home square still shears on one arrow. The calculus fixture is still a graph and a line.

### Ranked

1. **The agent was watching the form, and the stamp put the instruction in the sentence that should flip.** That is the batch 1 failure, back in the file a new course actually edits. Fixed. A green dot plus a static instruction is still unfinished.
2. **The loop named independence and the council, and did not say how one agent keeps the pitches apart, and close checked the tag against the config.** Fixed. Separate files, then one rebuttal, then one choice, then a prototype, then the three reviewers. Close opens the book.
3. **The tool definition allowed a card with no station, and it called `observe` the thing the learner looks at.** Fixed in the description, the schema, and the scaffold. The JSON is the contract. `node kit/scaffold.mjs` is the call.
4. **The example throughline was four sentences, and the learner never reads that field.** The field is now one sentence. The lede still names three threads, which is the door, and the five pictures stay. Roots is the page where they count. That question belongs to a reframe round. It does not belong in this one.
5. **Save it.** The next batch is a reframe on this pictured slice, or 2 to 4 pictures of a new course from a section someone opened. Do not put the reading stops back. Do not merge from this review.

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

## Animation batch 1

Viewport 1280×900, device pixel ratio 2. Headless Chrome. Before: `/opt/cursor/artifacts/anim-before/`. After: `/opt/cursor/artifacts/anim-after/`.

### Root causes

1. Julia and Newton published each strip of an unfinished pass, and every drag or view change aborted that pass and started another. During a Newton drag, 24/24 samples were still `drawing`.
2. The sharp pass was capped at 560 CSS pixels and drawn with smoothing onto a 1144×1144 device canvas (572 CSS × 2). The idle picture was blurry.
3. The Julia film used `setTimeout(90)`. Measured gaps were 76.7–108 ms around a mean of 90.2 (stddev 6.6, 21 frames). Unmount cleared the play timer and the worker, and left the loading timer. The main-thread fallback timers were not tracked.
4. Newton restarted a full final and ran KaTeX on every pointer move, so the picture never settled while the root was moving.
5. The paper replaced its formula and fate DOM on every pointer move.
6. Domain colouring filled and blitted a full frame while the tab was hidden. The 3D loop and several play clocks kept a frame scheduled, and a hidden gap could jump the parameter (the lab clock was not clamped).
7. Kit pictures set `canvas.width` on every paint, which clears the bitmap, and painted on every pointer move. Unmount removed listeners and did not cancel a frame.

### Fixes

- `js/core/fractal-view.js` fills an offscreen buffer and publishes only when the pass is complete. A drag keeps one coarse pass; a second coarse request waits. A sharp request replaces it. Idle (90 ms) asks for a final the size of the plane’s backing store, capped at 1400 on the long edge. When that bitmap matches the canvas, the blit is 1:1 with smoothing off. A hidden tab drops the pass and asks for the final when the tab is visible. Suspend and destroy cancel the frame.
- Julia playback is one `requestAnimationFrame` plus elapsed time (`nextFilmFrame`, 90 ms). A frame that is not ready is not skipped. The loading timer, the fallback timer, and the play frame are cleared on cancel and unmount. The words stay “animation loading”.
- Newton requests a coarse picture while a root moves and a sharp picture on release or commit. The formula and readout share one frame during the drag and flush immediately on release.
- The paper coalesces the formula and fates to one frame during a drag and paints immediately when the pointer goes up. The planted sentence is unchanged.
- Domain colouring does not paint while hidden. The 3D loop does not schedule while hidden, and a gap over 80 ms does not move the camera. Play clocks on the lab, linear maps, curves, mappings, powers, reciprocal, roots, the principal root, arithmetic, branches, the staircase, and the shared derivative animator pause the same way and cancel on pause and unmount.
- The kit copies the same clock (`syncCanvas`, `createFrame`). Chips, keys, and pointer-up still paint immediately. Pointer-move paints once per frame. Unmount calls `stop()`.

### Frame timings

Newton drag, 24 samples. Before: interval mean 34.9 ms, min 22.5, max 64.6, stddev 12.5, and 24/24 samples still `drawing`. After: mean 32.7 ms, min 12.3, max 71.2, stddev 14.0, and 0/24 samples `drawing` (every sample was a finished draft or the sharp picture). Idle draws while ready: 0 before and 0 after. Draws in the 600 ms after the drag settled: 0 before and 0 after. After the drag the host is `ready`, `crisp=1`, `edge=1144`, canvas 1144×1144.

Julia film, 21 frames. Before: gap mean 90.2 ms, stddev 6.6, min 76.7, max 108. After, the two gaps before the tab was hidden: 87.5 ms and 78 ms. The 466 ms gap is that hidden pause, not a late frame. While the film was hidden, live animation frames were 0 and one already-queued plane flush ran. After the film, draws while hidden were 0. Live frames at rest, while hidden, and after leaving for Newton: 0 before and 0 after. The paused picture is `ready`, `crisp=1`, `edge=1144` on a 1144×1144 canvas. Idle draws while ready: 0.

Paper. Before, the drawImage probe saw 0 intervals (the trails are strokes). After, the plane’s own draw counter during the drag: 17 intervals, mean 16.6 ms, min 11.8, max 21.5, stddev 1.7. Every sample still said “Planted. Press Again to apply the formula once.” Idle draws: 0 before and 0 after. Draws after the pointer went up: 0.

### Screenshots

Paused, before:

- `/opt/cursor/artifacts/anim-before/before-julia-paused.png`
- `/opt/cursor/artifacts/anim-before/before-julia-paused-after-film.png`
- `/opt/cursor/artifacts/anim-before/before-newton-paused.png`
- `/opt/cursor/artifacts/anim-before/before-newton-after-drag.png`
- `/opt/cursor/artifacts/anim-before/before-paper-paused.png`
- `/opt/cursor/artifacts/anim-before/before-paper-after-drag.png`

Paused, after:

- `/opt/cursor/artifacts/anim-after/after-julia-paused.png`
- `/opt/cursor/artifacts/anim-after/after-julia-paused-after-film.png`
- `/opt/cursor/artifacts/anim-after/after-newton-paused.png`
- `/opt/cursor/artifacts/anim-after/after-newton-after-drag.png`
- `/opt/cursor/artifacts/anim-after/after-paper-paused.png`
- `/opt/cursor/artifacts/anim-after/after-paper-after-drag.png`

### Kit

`node kit/smoke.mjs` scaffolds `kit/examples/linear-algebra.config.json` and passes, including the leftover-loop check and the check that the generated `js/core/anim.js`, `js/stations/shape.js`, and `js/stations/home.js` use the clock. `node tools/fractal-smoke.mjs` passes, including the check that one band is not published and that suspend, destroy, and `createFrame.stop` leave no queued frame.

Kit and skill files changed:

- `kit/template/js/core/anim.js`
- `kit/template/js/stations/addresses.js`
- `kit/template/js/stations/graph.js`
- `kit/template/js/stations/home.js`
- `kit/template/js/stations/number-line.js`
- `kit/template/js/stations/shape.js`
- `kit/stations/roots.js`
- `kit/stamp-station.mjs`
- `kit/smoke.mjs`
- `kit/SKILL.md`
- `kit/mcp-tool.json`

The reference site keeps the same clock at `js/core/anim.js`. The tool schema did not gain fields. The description of `generate_study_site` now states the pause contract.

### Residues

- Film frames stay at most 220 on the long edge, so the playing picture is softer than the paused still. The paused still is the 1:1 bitmap.
- A 90 ms beat on a vsync clock lands on about 83 or 100 ms. The two measured gaps before the hide were 78 and 87.5 ms. The probe samples every 16 ms, so a gap can read a little short.
- One Newton drag interval reached 71.2 ms. No sample in that drag was an unfinished strip.
- Hiding the tab during the Julia film let one plane flush run. That flush was a frame already requested. Live animation frames while hidden were 0. The fractal does not start a new pass until the tab is visible.
- Kit canvases still cap device pixels at 2. The site plane caps at 3. The fractal final follows the plane’s canvas, not a second cap.
- The paper probe now uses the plane draw counter. A drawImage counter still cannot see those strokes.

## Animation batch 1 close review

Close pass on controls, motion, and the picture at one station. Headless Chrome, DPR 1 and DPR 2, desktop 1280×900 and phone 390×844. Before: `/opt/cursor/artifacts/close-before/`. After: `/opt/cursor/artifacts/close-after/`. `node tools/fractal-smoke.mjs` and `node kit/smoke.mjs` both pass. The kit smoke scaffolds `kit/examples/linear-algebra.config.json` and checks that the generated clock caps device pixels at 3.

### Findings

The batch 1 clock, the offscreen fractal pass, and the hidden-tab pause were already doing their job on Julia, Newton, the paper, and most play buttons. Idle and paused pictures were complete (`ready`, `crisp=1`, edge equal to the canvas). Drag intervals on the desktop sat on 16.7 ms. These were not.

1. Shrink the ring and Turn the direction once never changed their labels, and a second click restarted the motion. In the frozen window after that second click: 108 draws and 180 frames, and the readout kept moving.
2. Walk across the negative real axis kept its resting label, and a second click started the walk again.
3. The Julia film stored every frame at 220 on the long edge and blitted that into a 557–1114 canvas. Playback was softer than the still.
4. Below 52rem the fractal column was min-content. On a phone at DPR 2, dragging a Newton root typeset the long product, the column grew, and the plane jumped from 644 device pixels to 1312. The drag’s longest frame interval was 33.4 ms there (mean 18.8). The 71.2 ms interval from batch 1 did not reappear on this machine: a full Newton frame at 220 is about 6 ms here, and the desktop drag never left 16.8 ms.
5. Kit `syncCanvas`, the colour wheel, and the lab domain canvas capped device pixels at 2. The plane caps at 3. At DPR 2 the lab domain bitmap was 441×441 on a 441 CSS canvas.
6. OrbitControls reports a pan as still moving until the target hits exact 0, so the 3D loop kept drawing after the pointer was up. Graph 4D, 900 ms after a drag plus a 600 ms quiet window: 180 draws and 36 frames. The lab 3D view did the same. Reduced motion’s Turn 45° left 24 frames scheduled and 0 draws.
7. A linear flush already queued could change the stage text while the tab was hidden. Draws while hidden were already 0.
8. A plane frame that was queued when the tab hid could still paint. The hub had no visibility listener.

Pause, hidden, remount, and reduced motion were already honest on arithmetic, the staircase, curves, mappings, linear (apart from that flush), powers, limits, the principal root, reciprocal, the lab play button, and Graph 4D’s Spin. Roots says Skip to the end and a second click finishes the walk. That is not a pause, and the words stay. The paper’s one draw after the pointer goes up is the release paint. The opening line stays “Steps shown: 8 of 8.” A drag puts back “Planted. Press Again to apply the formula once.”

### Fixes

- The ring button says Pause while it shrinks, and Turn the direction once says Pause while it sweeps. A second click freezes the ring or the angle. The resting words are unchanged. The slider and the origin button stop the motion too.
- While a branch walk is running, that button says Stop walking. A second click leaves the point and the trail where they are and says Stopped.
- The film buffer stays at 220. The worker then draws the frame on screen, and the next one, at the device size up to 640 on the long edge. At DPR 1 that bitmap matches the canvas, so the blit is 1:1. The main-thread fallback is sliced so one frame is not a single long fill. After the film the still is the full final, as before.
- Newton’s formula is typeset on release. During the drag only the readout is written, on the same frame as the guess handle. The fractal column is `minmax(0, 1fr)` at every width, and the formula scrolls inside itself, so the product cannot widen the plane.
- A fractal slice starts at 12 rows and the next slice is sized from the time that one took, with a cap of 40 rows. `budgetMs: 0` still paints one slice and does not publish.
- `syncCanvas` defaults to 3, on the site and in the kit. The colour wheel and the lab domain canvas use the same cap. Three.js allows 3 and still keeps its pixel budget.
- When the pointer is up and the leftover camera motion is under about a pixel, damping is flushed and the 3D loop stops. A hidden tab cancels a queued plane frame and keeps it dirty; the one hub listener paints it when the tab is visible. The linear flush waits for the tab as well.

### Numbers

Newton drag, 23 frame intervals, no long task, all four viewports. After: mean 16.7 ms, max 16.7 or 16.8. Before, the phone at DPR 2: mean 18.8, max 33.4. Canvas width after the drag equals the idle width (1114, 557, 644, 322). Phone scroll width stays 390. Eighty milliseconds after release the host can still say `drawing` at edge 220. Once settled: `ready`, `crisp=1`, same edge, 0 draws in the next 600 ms.

Julia drag, 17 intervals: mean 16.7, max 16.8, no long task. Film at frame 2: DPR 1 edge 557 and 322 with `crisp=1` (the canvas size). DPR 2 edge 640 on a 1114 and a 644 canvas, `crisp=0`. After the film: `ready`, `crisp=1`, edge equal to the canvas, 0 draws. Hidden after the film: 0 draws, 0 frames.

Paper drag: mean 16.7, max 16.8, no long task. After the pointer goes up: 1 draw and 1 frame, then stop.

Every play control, second click, 600 ms quiet: 0 draws and 0 frames. The readout and, where the canvas is 2D, five sample pixels do not move. Labels while running, then after the second click: Pause then Shrink the ring; Pause then Turn the direction once; Stop walking then Walk across the negative real axis. The others were already honest (Stop, Stop walking, Pause, Skip to the end, Stop the sweep, Stop spinning).

Hidden tab while playing, then leave for home: curves, lab, Graph 4D, linear, limits. Hidden draws 0, hidden frames 0, no readout drift, motion resumes, orphan draws 0. Reduced motion: Step, Next stage, Turn 45°, and no film on Julia. Quiet draws 0 and quiet frames 0, including Turn 45°.

Graph 4D drag: frame max 16.7 ms, draw max 20.5 ms, no long task. Idle before the drag, and 900 ms after it: 0 draws. Lab domain at DPR 2: bitmap 882×882 on a 441 CSS canvas, `ready`, 0 draws after the drag settles. Lab 3D drag: one frame interval at 33.4 ms, no long task, and 0 draws once settled.

### Screenshots

Before, paused and after the gesture:

- `/opt/cursor/artifacts/close-before/desk2-julia-paused.png`
- `/opt/cursor/artifacts/close-before/desk2-julia-film.png`
- `/opt/cursor/artifacts/close-before/desk2-newton-paused.png`
- `/opt/cursor/artifacts/close-before/desk2-newton-after-drag.png`
- `/opt/cursor/artifacts/close-before/phone2-newton-after-drag.png`
- `/opt/cursor/artifacts/close-before/desk2-paper-paused.png`
- `/opt/cursor/artifacts/close-before/desk2-lab-domain.png`

After:

- `/opt/cursor/artifacts/close-after/desk2-julia-paused.png`
- `/opt/cursor/artifacts/close-after/desk2-julia-film.png`
- `/opt/cursor/artifacts/close-after/desk2-julia-after-film.png`
- `/opt/cursor/artifacts/close-after/desk1-julia-paused.png`
- `/opt/cursor/artifacts/close-after/phone2-julia-film.png`
- `/opt/cursor/artifacts/close-after/desk2-newton-paused.png`
- `/opt/cursor/artifacts/close-after/desk2-newton-after-drag.png`
- `/opt/cursor/artifacts/close-after/phone2-newton-after-drag.png`
- `/opt/cursor/artifacts/close-after/phone1-newton-after-drag.png`
- `/opt/cursor/artifacts/close-after/desk2-paper-paused.png`
- `/opt/cursor/artifacts/close-after/desk2-paper-after-drag.png`
- `/opt/cursor/artifacts/close-after/desk2-lab-domain.png`
- `/opt/cursor/artifacts/close-after/desk2-graph4d-settled.png`
- `/opt/cursor/artifacts/close-after/desk2-lab-graph4d.png`

### Residues for the mid reviewer

- At DPR 2 the playing Julia frame is 640 on the long edge. The desktop still is 1114 and `crisp=1`. A phone canvas of 644 is 4 pixels past 640, so those playing frames stay `crisp=0` and the blit is smoothed. The stored film is still 220. The paused still is the full backing store.
- Eighty milliseconds after a Newton release the host can still read `drawing` at the 220 draft. The settled picture is the sharp final. The 71.2 ms interval did not reproduce; the longest drag interval here was 16.8 ms.
- One lab 3D drag interval was 33.4 ms. No long task was recorded, and the view was idle once the pointer had been up.
- Roots still says Skip to the end. A second click finishes the power. It is not a pause.
- The reciprocal sphere is WebGL, so the pixel sample is empty. Its frozen window was 0 draws and the readout held.
- DPR 3 was not emulated. The clock, the wheel, the lab domain canvas, and the 3D view now share the plane’s cap of 3. The 3D view still has its pixel budget, so a large view will not actually reach 3.

## Animation batch 1 mid review

Mid pass: one motion, at Test 1’s quality, on every station and both maps. Headless Chrome, desktop 1280×900 and phone 390×844, device pixel ratios 1, 2, and 3. `node tools/fractal-smoke.mjs` and `node kit/smoke.mjs` both pass. The kit smoke scaffolds `kit/examples/linear-algebra.config.json` and checks that the generated clock exports `createMotion`, caps device pixels at 3, and that `kit/SKILL.md` and `generate_study_site` say Pause, name that clock, and say a second click does not jump to the end. Screenshots: `/opt/cursor/artifacts/mid-after/`.

### Decision

“Skip to the end” told the truth about a jump, and the jump was the thing that did not match the rest of the site. The running label is Pause everywhere. A second click freezes the picture where it is and puts the resting label back. Roots keeps the spiral: the readout stays `z¹ = 1 (length 1, angle 0)`, the button returns to “Raise root 0 to the power 5”, and `data-state` is `paused`. A later click continues that power. A sweep or a walk starts its gesture again from the frozen picture. Reduced motion steps, and the step button does not say Pause.

### Findings

The close-review pause buttons, the offscreen fractal pass, and the hidden-tab hold were already in place. These were not one contract.

1. Play loops still lived in the stations: a hidden check, a stall, and a private `requestAnimationFrame`, copied across roots, the principal root, the staircase, branches, arithmetic, reciprocal, powers, mappings, linear maps, curves, and the lab. The derivative animator was the only shared one, and limits borrowed it.
2. Roots said “Skip to the end” and a second click finished the power. Branches and the staircase said “Stop walking”. The principal root said “Stop the sweep”. Graph 4D said “Stop spinning”.
3. Eighty milliseconds after a Newton release the host could still say `drawing` while the 220 draft was the picture on screen.
4. The Julia film drew the on-screen frame at 640. The desktop still was 1114. A phone canvas of 644 was 4 pixels past that cap, so the playing blit stayed smoothed.
5. The film’s “how many frames are ready” count treated only the current sharp bitmap and the next one as ready. After frame 0 left the screen, frame 0 no longer counted, the count fell to 0, and the clock held itself on frame 1. Every viewport sat on frame 1 for 25 seconds with the phase still `playing`.
6. Branches under reduced motion jumped to the end of the walk.

### Fixes

- `createMotion` in `js/core/anim.js` is the play clock. `run(ms, onFrame(u), onDone)` and `drive(onFrame(dtMs))` use `createFrame` and `elapsedMs`, so a hidden tab and a gap over 80 ms do not move the picture. `cancel()` drops a queued callback. The stations above call it, and `createAnimator` is that clock, so limits keeps its import. The kit template is the same file, comment header aside.
- Running labels are Pause. Resting labels are unchanged. Graph 4D’s spin still rides the 3D view’s frame; the word is Pause, and a second click returns to Spin.
- A sharp fractal pass does not rename a finished draft or a finished still to `drawing`. The status stays on the picture that is up until the next finished picture replaces it.
- The stored Julia film stays 220. The frame on screen is the canvas’s device size, capped at the still’s long edge of 1400. The worker yields between coarse frames so that sharp frame can run. The film shows the sharp frame, and an index that has already been shown still counts as ready, so the clock can move on to the next one.
- Reduced motion on branches takes one sample of the walk (`1/60`) per click and keeps the resting label.

### Numbers

Newton, 80 ms after release, status text empty on every viewport. No host read `drawing`. Desktop DPR 1 and the phone at DPR 1 were already `ready` and `crisp=1` (edge 557 and 322). The other four were `draft` at edge 220. Settled: `ready`, and the edge equals the canvas, except desktop DPR 3 where the canvas is 1671 and both the still and the later film stay at 1400 with `crisp=0`. Settle waits: 1 ms, 193 ms, 348 ms, 1 ms, 43 ms, 141 ms. The longest gap between paint calls during the drag was 18.0–23.4 ms.

Julia film, first playing frame, edge and crisp: 557/1, 1114/1, 1400/0 on a 1671 canvas, 322/1, 644/1, 966/1. The phone canvas of 644 matches, `crisp=1`. After the film: `done`, then `ready` at that same edge, in 526–1092 ms. A drag’s longest paint gap was 16.5–18.2 ms. No console errors, no failed assets, no sideways scroll (1265 at desktop, 390 on the phone).

Second click, then 400 ms with no further paint, on roots, both derivative buttons, the principal root, both walk buttons that were measured (branches and the staircase), arithmetic, mappings, curves, linear, powers, reciprocal, limits, the lab, and Graph 4D. Running label Pause. After the click: the resting label, and 0 paint calls. Roots readout held `z¹ = 1 (length 1, angle 0)`.

Reduced motion: roots says “Next power” and stays `stepping`; the derivative says “Shrink the ring (one step)”; branches keeps “Walk across the negative real axis” and the status “walking...”; the lab says “Step”; Graph 4D says “Turn 45°”. None of them say Pause. A Julia drag under reduced motion leaves the stage `idle` and the picture `ready`.

Story Map from Julia lands on `#home` with the body map `test1`, 21 stations, the addresses stop present, T1 pressed, and 6 stops dim. The F1 previous link opens the disk on Test 2. The T2 next link on roots opens the power map on Test 1.

A quiet window after Newton was 0 paint calls on four viewports. Desktop DPR 1 and desktop DPR 3 each recorded 36 stroke calls, one paint, inside that window. After every Julia film the same window recorded 13 stroke calls, one paint. Those are single paints, not a clock that kept running.

### Screenshots

- `/opt/cursor/artifacts/mid-after/desk2-newton-paused.png`
- `/opt/cursor/artifacts/mid-after/desk2-newton-after-drag.png`
- `/opt/cursor/artifacts/mid-after/desk3-newton-paused.png`
- `/opt/cursor/artifacts/mid-after/desk3-newton-after-drag.png`
- `/opt/cursor/artifacts/mid-after/phone1-newton-after-drag.png`
- `/opt/cursor/artifacts/mid-after/phone2-newton-paused.png`
- `/opt/cursor/artifacts/mid-after/phone2-newton-after-drag.png`
- `/opt/cursor/artifacts/mid-after/desk1-julia-paused.png`
- `/opt/cursor/artifacts/mid-after/desk2-julia-paused.png`
- `/opt/cursor/artifacts/mid-after/desk2-julia-film.png`
- `/opt/cursor/artifacts/mid-after/desk2-julia-after-film.png`
- `/opt/cursor/artifacts/mid-after/desk3-julia-film.png`
- `/opt/cursor/artifacts/mid-after/phone2-julia-film.png`
- `/opt/cursor/artifacts/mid-after/phone2-julia-after-film.png`
- `/opt/cursor/artifacts/mid-after/phone3-julia-film.png`
- `/opt/cursor/artifacts/mid-after/desk2-roots-paused.png`
- `/opt/cursor/artifacts/mid-after/desk2-home-thread.png`

### Kit

`node kit/smoke.mjs` passes, including the generated clock, the Pause sentences in `kit/SKILL.md` and `kit/mcp-tool.json`, and the linear-algebra scaffold. The generated `js/core/anim.js` matches the reference clock. The template header says it is that copy. `syncCanvas`, `createFrame`, `elapsedMs`, `nextFilmFrame`, and `createMotion` are the same functions, and the device-pixel cap is 3.

### Residues for the wide reviewer

- Desktop DPR 3 draws a 1671 canvas. The still and the film both stop at 1400, so they match and `crisp=0`. A Julia frame at 1400 is about 108 ms, past the 90 ms beat, so the film holds for the sharp frame instead of skipping it. A cap of 1671 would be about 150 ms a frame.
- Graph 4D’s spin uses the 3D view’s frame. The label is Pause, a second click stops it, and the quiet window was 0 paint calls.
- The lab 3D drag interval of 33.4 ms from the close review was not measured again. The reciprocal sphere is still WebGL. The 3D view’s own pixel budget still keeps a large view under device pixel ratio 3.
- A later click resumes the roots power from the frozen exponent. A later click on a sweep or a walk starts that gesture again from the frozen picture.
- One paint can fall inside the 600 ms quiet window: 36 stroke calls after Newton on desktop DPR 1 and DPR 3, and 13 after every Julia film. The other Newton windows were 0.

### Verdict

PASS WITH FIXES.

## Animation batch 1 wide review

Wide pass on what the motion makes the learner observe, across Test 1 and Test 2. Headless Chrome, desktop 1280×900 and phone 390×844, device pixel ratios 1, 2, and 3. `node tools/fractal-smoke.mjs` and `node kit/smoke.mjs` both pass. The kit smoke checks that `kit/SKILL.md` and `generate_study_site` state the same later-click rule, the film hold, and the 3D pixel budget. Screenshots: `/opt/cursor/artifacts/wide-after/`.

### Decision

Pause hands the learner the value they are reading. A later click continues that value. When the gesture has finished, a later click plays it again from the start. The picture does not jump backward. Roots already did this. A sweep, a walk, a lap, a stretch of the arithmetic move, and the turn of the reciprocal sphere did not: a later click threw the mark back to the start, or, on the sphere, reversed it once it had passed halfway. That jump is not the function. The function moves the plane. The colour of a start is the fate of doing that motion again, so a Julia frame that is not ready is waited for, not skipped and not replaced by a softer one.

The film at device pixel ratio 3 stays on the still's long-edge cap of 1400. It is not precomputed and it is not capped lower. On this headless machine a desktop frame at 1400 took 132–184 ms (mean 167, nine gaps). The 90 ms beat holds until the sharp frame exists. A phone frame at 966 stayed on the beat (about 83–100 ms). Shrinking the frame to buy the beat would put blur on the boundary the colour is teaching. Storing every sharp frame would hold the film back and keep a stack of 1400 bitmaps. Neither is the picture.

The one paint inside the old 600 ms window was two different things. After the Julia film it was a second full pass of a bitmap that was already the sharp final. That pass is not started. After Newton it was the final blit landing in the same moment the status said ready. That blit stays. Measured from 50 ms after ready, the next 600 ms was 0 paints and 0 strokes on all six viewports, for both pictures.

Graph 4D's spin stays on the 3D view's frame, so the angle and the picture move together. The button says Pause, a second click freezes the angle, and the angle does not jump back. At desktop device pixel ratio 2 the view's buffer was 850×850 on a 425 CSS canvas, which is ratio 2. The reciprocal sphere was 884×662 on a 442×331 canvas, ratio 2, drawn by WebGL into that buffer. There is no second blit. The view's pixel budget is the cap for a large picture: this graph is 425 CSS px on a side, and 425²×9 is under 2.1e6, so ratio 3 is still allowed here. A view past about 483 CSS px on a side is where ratio 3 is cut. Pause on both was 0 paints in the quiet window.

A fresh agent can reproduce this from `kit/SKILL.md` and `kit/mcp-tool.json` alone. Both say: a later click continues from the frozen value; a finished motion plays again from the start; the picture does not jump backward; a film waits and does not precompute; the playing frame and the still share the cap of 1400; a bitmap that is already the final is not painted again; a camera spin may use the 3D view's frame; the pixel budget is the cap.

### Fixes

- The derivative's turn starts from the angle on screen and continues the degrees that are left. It does not snap to −180°.
- A paused branch walk continues from its frozen parameter. Dragging z clears that pause. A finished walk still plays again from the start.
- The staircase lap, the principal-root sweep, the arithmetic move, and a line's probe continue from the frozen value. A circle's run continues the remaining turn. The reciprocal sphere keeps its direction until it reaches the end, then a later click turns back.
- When the Julia film's last frame is already the sharp final, the page names it ready and does not draw it again.

### Numbers

Julia paused, then after the film, edge and crisp. Desktop: 557/1, 1114/1, 1400/0 on a 1671 canvas. Phone: 322/1, 644/1, 966/1. The film and the still match. Quiet window after every film: 0 paints, 0 strokes. Scroll width 1265 at desktop, 390 on the phone.

Newton settled ready at that same edge. Settle waits: 82 ms, 245 ms, 414 ms, 82 ms, 165 ms, 245 ms. Quiet window: 0 paints, 0 strokes.

Roots paused at exponent 2, resting label "Raise root 0 to the power 5", `data-state` paused. The later click was still at exponent 2.

The derivative paused at 21° with the label "Turn the direction once". The later click was at 28°, not −180°.

The branch walk paused at t = 0.25, status "Stopped.", resting label. The later click was walking at t = 0.29.

Arithmetic paused on "Stretch by the length of z₂." The later click was still that sentence, not the spin that opens the move.

Graph 4D spin said Pause, then Spin. The angle went 0 → 0.151 → 0.157 and stopped. Quiet window 0. The sphere's turn said Pause at 7°, rested at 11°, and the later click was at 22°, still toward 180°. No console errors.

### Screenshots

- `/opt/cursor/artifacts/wide-after/desk2-julia-paused.png`
- `/opt/cursor/artifacts/wide-after/desk2-julia-after-film.png`
- `/opt/cursor/artifacts/wide-after/desk3-julia-paused.png`
- `/opt/cursor/artifacts/wide-after/desk3-julia-after-film.png`
- `/opt/cursor/artifacts/wide-after/desk2-newton-settled.png`
- `/opt/cursor/artifacts/wide-after/desk3-newton-settled.png`
- `/opt/cursor/artifacts/wide-after/phone2-julia-paused.png`
- `/opt/cursor/artifacts/wide-after/phone2-julia-after-film.png`
- `/opt/cursor/artifacts/wide-after/phone2-newton-settled.png`
- `/opt/cursor/artifacts/wide-after/desk2-graph4d-paused.png`

### Kit

`node kit/smoke.mjs` passes, including the new sentences in `kit/SKILL.md` and `kit/mcp-tool.json`. The clock comment in `js/core/anim.js` and in the template states the later click. The tool schema did not gain fields.

### Residues

- Desktop device pixel ratio 3 draws a 1671 canvas. The still and the film stop at 1400, so `crisp=0`. The held beat on this machine was 132–184 ms. That hold is the picture.
- The first and last film gaps can read short (about 20–50 ms) when the sharp frame was already waiting. The middle of a 1400 film does not.
- The 3D pixel budget was not remeasured at device pixel ratio 3. At the size this page draws, the budget still allows ratio 3. It cuts ratio 3 only for a view past about 483 CSS px on a side.
- A finished gesture plays again from its start. That start is a new showing, and the mark moves to the start because the learner asked for the gesture again.

### Verdict

READY TO MERGE. REFRAME ROUND: no.

## Animation batch 1, two P2 notes

Checked both automated notes against `7d24e98` and the head that carries this note.

The Newton note is real. A coarse pass that is already painting is kept when the pointer moves again, and that pass can span several frames. `fill` was calling `liveRoots()` on every band, so one published bitmap could mix two root positions. The pass now calls `hooks.sample` once, when it begins, and every band of that bitmap gets that value. Newton samples a copy of the roots there. The next pass samples again. Julia's parameter is not on this path: a drag of `c` suspends the picture, so a live `c` is not painted across bands.

The raise-clock note is moot. `raiseSeen` is gone. The raise, and the other play buttons, use `createMotion`. Each `run` and each `drive` builds a new clock and primes it on the first tick, so an idle gap before a replay or a resume is not added to the origin. The same is true of the Julia film clock, which is new for each film. `elapsedMs` still treats a gap longer than 80 ms inside one run as hidden time. That is the hidden-tab rule, and it is not this bug. The kit clock is the same functions, so it did not need a logic change.

`node tools/fractal-smoke.mjs` checks that one retained draft keeps the sample from its first band after the live value changes, that the next pass samples again, and that Newton fills from that sample. Both smokes check that a replay and a resume after a gap longer than 80 ms start at zero, and that `drive` does not spend the idle time.

## Films batch 1

Three films sit on the stations that already teach the move. Multiply is on `#arithmetic`. Roots of unity is on `#roots`. The orbit of 0 is on `#zero`. The page is a HyperFrames film with one paused timeline on `window.__tl`. The site's `createMotion` seeks that timeline. After each seek, `gsap.ticker.sleep()` runs, so a paused film draws 0 frames. There is no play bar inside the page.

### Beyond the patch

- `loading="lazy"` is gone. The stage is overflow hidden and CSS-scaled, which is a bad place for a lazy iframe, and a paused page is one seek and then sleep.
- The iframe stays `visibility: hidden` until the opening seek has landed on the last frame. Each page's own script now calls `draw(duration)` rather than `draw(0)`, so the first paint inside the page is that finished frame too. Durations are 10.0, 11.6, and 17.86.
- If `prefers-reduced-motion` turns on while a film is playing, the clock cancels and the frame stays where it is. The button label updates in the same moment. A scrub while reduced motion is on snaps to the nearest finished stop (just before a beat, then the end). It does not stop on a 1/30 s step between beats.
- The time label rounds to tenths before it prints. 1.45 s reads 1.5 s, and the land beat at 7.05 s reads 7.1 s. `(1.45).toFixed(1)` is `"1.4"` in this runtime, which made the first reduced stop of the generated film read 1.4.
- `films/shared/house.css` no longer declares a bold face. `DejaVuSans-Bold.ttf` is not shipped, and a request for it would 404. The two faces that are shipped stay: DejaVu Sans and DejaVu Sans Mono.
- The comment in `js/data/textbook.js` now calls (1.4.10) an equation. The text on the page never said Identity.
- The kit takes an optional `films` field on `generate_study_site`. One film per station. The page has to sit beside the config, publish `window.__tl` and `window.__beats`, carry a cite and a `[data-readout]`, and must not contain `controls.js`, `gsap.ticker`, `requestAnimationFrame`, `setTimeout`, or `setInterval`. A missing page is an error. A local asset that would 404 is an error. The scaffold writes `js/data/films.js` (an empty list when the course has no films) and copies `js/core/film.js`. The template mounts the panel only when that station has a film, and a failure there does not take the station down. `kit/smoke.mjs` scaffolds a one-film site and runs the same pause checks on that copy.

### Citations

The HTML anchors are the ones named in `js/data/films.js`, checked against the open edition on 2026-10-20.

- Multiply: §1.4, Equation (1.4.10) and Figure 1.4.13, `sec_geometry-2.html#fig_ch-01-17`. `pdf` is null.
- Roots of unity: §1.5, Equation (1.5.5), `sec_algebra-2.html#Roots_of_Unity`. `pdf` is null.
- Orbit of 0: §4.2, Theorem 4.2.11, PDF Theorem 4.9, `#Kc_Connected`. Example 4.2.12, `#Julia_Connected_Ex`, `pdf` null. Exercise 8, `#x4_2_8`, `pdf` null.

UNCHECKED: every PDF number other than Theorem 4.2.11 = PDF Theorem 4.9. Equation (1.4.10), Figure 1.4.13, Equation (1.5.5), Example 4.2.12, and Exercise 8 have no PDF pin, and this pass did not open the PDF to invent one. The wide review above calls (1.4.10) an Identity. The book labels it an equation. That older paragraph is the record of what was written then, and it is left as written.

### Clock

`node tools/film-smoke.mjs` passed, including the reduced-motion scrub and the freeze when reduced motion turns on.

`node tools/fractal-smoke.mjs` passed. The fractal clock was not changed.

`node kit/smoke.mjs` passed, including the generated film: theme follows into the page, the readout is site text, Pause freezes with 0 page frames and 0 site frames, the next click continues, Play again starts at 0, reduced motion steps and never says Pause, unmount on home, and 390 px does not scroll sideways. This machine is Node 22, so `WebSocket` is global and `--experimental-websocket` was not passed. Node 20 still needs that flag.

Headless, inside the site, at 1280 px and at 390 px, light and dark, all three films: no console errors and no response at status 400 or above. Each film opened on its last frame (10.0 / 10.0, 11.6 / 11.6, 17.9 / 17.9). The iframe's `data-theme` matched the site. Pause froze at 0.4 s with the page's animation frames at 0 and the site's at 0. The next click continued to 0.6 s and the label returned to Play. Reduced motion on multiply stepped 10.0, then 1.6, 4.5, 7.1, then Start again at 10.0. Nothing scrolled sideways at 390 px.

### Pictures

These films are HTML and SVG, scaled with CSS into a box of aspect 1280/600. They are not canvases, so the device-pixel cap of 3 does not apply to a film. The cap stays on the canvas pictures.

A headless screenshot of the parent page does not include the iframe's pixels, even when the iframe is same-origin. The shots below are the film pages opened directly, clipped to the 1280×600 rows the panel shows, and zoomed to 390 px wide for the phone. That is the picture the panel scales. The multiply end frame shows zw at 75°, length 2.828. The paused multiply frame is the turn, before the stretch. Unity's paused frame is step 3 of 5. The orbit's end frame is c = 0.3 with the walk leaving.

### Verdict

READY TO MERGE.

## Films batch 1 — close review

Branch `cursor/films-batch-1-ad4f`, PR 7. Zoom: do the three films and the panel actually run, at 1280 and 390, light and dark, and does the kit describe the same clock? Verdict: **accept with fixes**.

The clock was already the site's clock. Pause freezes, the next click continues, a finished film starts again at 0, a hidden tab draws nothing, reduced motion steps finished frames and never says Pause, and leaving the station removes the iframe. What was weak was the picture on a phone, the dark colours, and the font payload.

### Fixed

- At 390 px the stage was 152 px tall and the page's 26 px lines were 6.5 px. The numbers under the film were readable. The picture was not. The stage now refuses to shrink those lines below 15 px. On a phone that makes the picture about 346 px tall, the plane fills the width, and the stage scrolls sideways for the column beside the plane. The page does not scroll sideways. The hint says so, and the stage is a keyboard scroll target. While that scroll is in effect, every visible line is copied under the film, not only `[data-readout]`, so the sentences are site text. A generated page that has no `.ln2` still copies its readout. At 1280 px the column is wide enough (the lines are 18 px) and nothing scrolls.
- Dark mode was the HyperFrames house palette: background `#14151A`, input `#9CCB8C`. The site's dark tokens are `#0d121c` and `#3fd0a0`. Light already matched. The three pages now set both themes from `css/theme.css`, and `make_films.py` writes the same block.
- `films/shared` was 1.2 MB, almost all of it the two full DejaVu faces. They loaded only when a film station mounted (home does not fetch them), which is the right moment, and they were the wrong size. They are now the glyphs these pages draw: DejaVu Sans 43 KB, DejaVu Mono 26 KB. `font-display: swap`. The iframe stays hidden until those faces are ready, or for 1.5 s, so the first shown frame is not a fallback face. GSAP (73 KB) still loads with the film, because the opening seek needs the timeline. `edges.js` stays in `films/shared` for a page that draws edges. These three have no `svg[data-edges]`, so they no longer request it.
- The multiply check, `(√3 + i)(1 + i) = (√3 − 1) + (√3 + 1)i`, was only inside the page. It is a readout now, so it sits under the film with the other computed lines.
- The phone control row is explicit: Play and the time on one line, the scrubber on the next. The time does not wrap.

### Checked and left as is

- Pause wording matches the clock rule and the other play buttons that use it: Pause while it runs, Play when it is frozen, Play again from the end, Next step and Start again when motion is reduced. Arithmetic's own button says "Play: spin, then stretch" and, reduced, "Start over". The film does not copy that longer label. The skill and the smoke require the short words.
- Headless, in the site, no console errors and no failed response. Light and dark, 1280 and 390. Multiply opens at 10.0 / 10.0 with `zw = 0.732 + 2.732i`, length 2.828, angle 75°, and the check line. Unity opens at 11.6 / 11.6 on root 0 = 1, and the line that step 5 lands on step 0. The orbit opens at 17.9 / 17.9 with `|z₁₃| = 5.111` and the walk leaving. Dark input is `rgb(63, 208, 160)`. Dark background is `rgb(13, 18, 28)`.
- Pause on multiply froze at 0.4 s. For the next 350 ms the page scheduled 0 animation frames and the site scheduled 0. The next click continued (0.6 s, then 0.7 s on the next run). A scrub to 1.5 s paused. Reduced motion stepped 1.6, 4.5, 7.1, 10.0, then Start again, and the button never said Pause. Play again from the end was at 0.1 s with the label Pause. Leaving for addresses removed `#films` and the iframe.
- `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` all exit 0. The kit run includes the generated film: theme follows, Pause draws 0 frames, the next click continues, Play again starts at 0, reduced motion never says Pause, unmount, and 390 px does not scroll the page.

### For the mid reviewer

The films are wired into the site. Same motion, same Pause word, same dark and light tokens, citations that link to Howell & Mathews, chips that link to real stations. They are not yet Test 1 quality on a phone, and on `#arithmetic` they are a second showing of a move the page already plays.

- Test 1 pictures reflow. A film is a 1280×720 page. On a phone the plane is now big enough to read `z`, `w`, and `zw`, and the sentences are site text under it. The column beside the plane, including the unity staircase, is one sideways scroll inside the stage. That is the honest fit for this page. It is not a stacked layout. If mid wants the staircase in the first screen, the unity page has to be drawn again, not scaled.
- `#arithmetic` already has "Play: spin, then stretch" on the draggable plane. The film is the book's fixed example, `√3 + i` times `1 + i`, and it sits above the station links, after the proofs. A learner can finish the gesture and never see it. `#roots` and `#zero` are the same placement: the film is a coda, not the picture the exercise sits on.
- The desktop film is the one that looks like the lesson. Diagram on the left, the sentence on the right, the computed lines repeated underneath, the source tag a real link. That is the part that matches Test 1. The phone scroll and the second play button are the part that does not.

## Films batch 1 — mid review

Mid pass: do the films tie into the station, and do they reach Test 1 quality? Headless Chrome, desktop 1280×900 and phone 390×844, light and dark. `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` all exit 0. Screenshots: `/opt/cursor/artifacts/films-mid/`.

### Decision

The film is the book's worked example, and it belongs where that example starts the gesture. The picture under it is the same move with the learner's own numbers. A phone stacks the page. A desk keeps the landscape lesson.

Under 600 CSS px of stage the 1280×720 page restacks. The plane fills the width. The unity staircase, or the sentences, sits under the plane. The stage grows to that height. Nothing scrolls sideways. At 600 and above the page stays landscape, scaled to the stage, showing design rows 0 to 600. The cut is the stage width, the same number in `js/core/film.js` (`PORTRAIT_W`) and in `films/shared/fit.js`.

One Pause owns the multiply idea. While multiply is the operation, the plane's "Play: spin, then stretch" is hidden. Pause on the film is that play. Slide, mirror, and the other operations hide the film and keep their own Play, because √3 + i times 1 + i is not their move. Raise stays on roots. It sends one root back to c. Dividing the staircase is the other gesture, so the two buttons are two moves.

### Fixes

- `films/shared/fit.js` groups the plane and its labels, and groups the unity steps `st0`…`stN` into `#stairs`. It leaves the orbit readout `st` alone. Portrait order is the chrome, the plane, the staircase, the sentences, then the cite. A line that has faded out does not keep an empty row. A cross-fade keeps its slot. Wide layout is the original 1280×720 page. The page has no timer of its own. `make_films.py` writes the same hook.
- Each station marks `[data-film-slot]`. `mountFilms` puts the panel there. With no slot, the panel still sits just before `nav.station-links`.
- Arithmetic: the slot is full width, after the operation chips and before the plane. A half column at desktop is under 600 px and would have forced the portrait stack on a desk. The hint under the plane says the film is the book's example and the drag varies it.
- Roots: the slot is the first thing in "Divide the staircase", before the live staircase. The sentence names Equation (1.5.5) and says the picture under the film divides the c and n the learner picked.
- The orbit of 0: the slot is in the panel after the theorem, before the c chips. The film walks c = i and then c = 0.3. The chips read those and two more. Pause on the film is the only play.
- Thread badges use the same cut as the rest of the site: `T1 · One point, two addresses`, and the same for T2, F1, and F2. The row under the film is `nav.station-links`: Story Map to `#home`, then the places this move returns. A link that names Test 1 or Test 2 is the chip that switches the map. The note says the switch at the top brings you back.
- A cite with `pdf: null` says "PDF number not checked." Theorem 4.2.11 keeps PDF Theorem 4.9 and is not flagged. Equation (1.4.10), Figure 1.4.13, Equation (1.5.5), Example 4.2.12, and Exercise 8 stay unchecked. No PDF number was guessed.

### Numbers

No console errors and no response at status 400 or above.

Desktop stage 901 px, layout wide, iframe still 1280 inside. The sentences sit beside the plane (line top 92, plane bottom 720). Phone multiply stage 322 px, iframe 322, layout portrait. The sentences sit under the plane (line top 393, plane bottom 391). Phone unity iframe 288 px. The staircase sits under the plane and ends at the iframe's right edge (288). Phone orbit lines sit under the plane. The page and the iframe stay within the width at both sizes.

Each film opens on its last frame: 10.0 / 10.0, 11.6 / 11.6, 17.9 / 17.9. Light background `rgb(246, 243, 236)`. Dark background `rgb(13, 18, 28)`. The iframe's theme matches the site on all three films, both sizes, both themes.

Multiply sits above the draggable plane. Its button says Play. `#arithmetic-animate` is hidden. Choosing add hides the slot and shows "Play: slide". Pause on the phone froze at 0.3 s. The next 400 ms scheduled 0 animation frames in the page and 0 in the site. The next click continued to 0.6 s. Reduced motion stepped Next step at 10.0, 1.6, 4.5, 7.1, then Start again at 10.0, and the button never said Pause.

Badges: multiply `T1 · One point, two addresses`. Unity `T2 · The staircase` and `T1 · One point, two addresses`, and the film sits above the live staircase. Raise is still there. Orbit `F1 · A sequence has a fate` and `F2 · Square, then slide`, on the Test 2 map, above the c chips. Story Map is `#home`.

The multiply cite and the unity cite and Example 4.2.12 say "PDF number not checked." The theorem line includes "PDF Theorem 4.9" and does not say that.

Hiding the multiply slot pauses the player. A paused or hidden film draws nothing: the panel still puts GSAP's ticker to sleep after each seek.

### Screenshots

- `/opt/cursor/artifacts/films-mid/desk-light-multiply.png`
- `/opt/cursor/artifacts/films-mid/desk-light-unity.png`
- `/opt/cursor/artifacts/films-mid/desk-light-orbit.png`
- `/opt/cursor/artifacts/films-mid/phone-light-multiply.png`
- `/opt/cursor/artifacts/films-mid/phone-light-unity.png`
- `/opt/cursor/artifacts/films-mid/phone-light-orbit.png`
- `/opt/cursor/artifacts/films-mid/desk-dark-multiply.png`
- `/opt/cursor/artifacts/films-mid/desk-dark-unity.png`
- `/opt/cursor/artifacts/films-mid/desk-dark-orbit.png`
- `/opt/cursor/artifacts/films-mid/phone-dark-multiply.png`
- `/opt/cursor/artifacts/films-mid/phone-dark-unity.png`
- `/opt/cursor/artifacts/films-mid/phone-dark-orbit.png`

### Kit

`js/core/film.js` and `kit/template/js/core/film.js` are the same file. The film block in `css/components.css` matches the template. `kit/SKILL.md` and `kit/mcp-tool.json` name the stack under 600 px, the unchecked PDF line, and `[data-film-slot]`. The `films` field did not gain keys. `kit/smoke.mjs` still scaffolds a one-film site and checks pause, continue, replay, reduced motion, unmount, and 390 px with no sideways scroll.

### For the wide reviewer

What the films ask the learner to see:

- Multiply. The arrow to z turns by the angle of w, then stretches by the length of w, and lands on zw. Lengths multiply and angles add. The book's numbers are z = √3 + i and w = 1 + i, so zw = 0.732 + 2.732i, length 2.828, angle 75°, and the check is (√3 − 1) + (√3 + 1)i. The plane under the film is that same turn and stretch with the learner's z₁ and z₂. Pause on the film is the play for that move.
- Roots of unity. The angles of 1 are 0, 2π, 4π, and so on. Divide each step by 5. Steps 0 to 4 are five different points. Step 5 lands on step 0, so there are only five roots. The staircase under the film divides the c and n the learner picked. Raise is the other move: one root, spiraling back to c.
- The orbit of 0. Each step squares, then slides by c. For c = i the walk from 0 cycles between −1 + i and −i, so it stays. For c = 0.3 the walk leaves, and |z₁₃| = 5.111. The chips read those two and c = 0 and c = −2. Theorem 4.2.11 says the Julia set is connected exactly when this orbit stays bounded. The checked PDF number is Theorem 4.9.

Residues:

- A stage between 600 and about 738 CSS px still scales the landscape page, so a 26 px line falls under 15 px. Portrait starts under 600, where the sentences are 16 px and the staircase steps are 15 px. The desktop stage measured here is 901 px, so those lines are about 18 px.
- The orbit station's own chips and the film's station links both name arithmetic and the paper. The chips are values of c. The links are the places the move returns, and they also name Julia and the seeds.
- The film still opens on the finished frame. Play from there starts again at 0. That is the clock the close review already accepted.

### Verdict

PASS WITH FIXES.

## Films batch 1 — wide review

Wide pass on what the learner is actually watching, across Test 1 and Test 2. Headless Chrome at 1280×900, 700×900, and 390×844, light and dark, plus a forced stage from 320px through 901px. `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` all exit 0. Screenshots: `/opt/cursor/artifacts/films-wide/`.

### Decision

One turn runs through both tests. Multiply turns the arrow to z by the angle of w and stretches it by the length of w. Lengths multiply and angles add. Roots of unity divides that angle, and the length stays 1, so the staircase closes after exactly n roots. The orbit of 0 squares, which is that same turn with w = z, and then slides by c. Theorem 4.2.11 says the Julia set is connected exactly when this orbit stays bounded.

Each film already made its own observation. Together they read as three neighborhoods. Multiply linked to addresses, powers, and Julia, and skipped the roots film. Roots linked to the staircase, the principal root, and powers, and never named the turn it was dividing or the square that follows. The orbit linked back to multiply, then to Julia, the seeds, and the paper, and skipped the roots. The badges were already the right kind of label: T1 on multiply, T2 and T1 on roots, F1 and F2 on the orbit. A badge is a thread the picture walks. Adding F2 to the multiply film would claim the film shows square-then-slide. The links are the spine, and they were the weak part.

### Fixes

- The same-move row is one chain, and it stays inside the kit's cap of four links.
  - Multiply: the two addresses, roots of unity (divide that angle by n), powers, and Test 2, the orbit of 0 (squaring is this turn with w = z).
  - Roots: multiply (the turn this divide reverses), the staircase, powers, and Test 2, the orbit of 0.
  - Orbit: Test 1 multiply, Test 1 roots of unity, Julia (every start, not only 0), and the seeds. The paper link left the film. The paragraph above the film and the station footer already send the learner to the flat paper, and that slot is the one the roots link needed.
- The roots picture says "Divide by 5: the multiply turn, backwards." The orbit opens on its finished frame with "The square is the multiply turn." The ledes say the same chain. The orbit lede states Theorem 4.2.11 in the words the picture is evidence for.
- Badges are unchanged. They name the thread the film walks.

The type residue is closed. From a stage of 600px to about 738px the landscape scale drew a 26px line under 15px. The cite was 20px and the section label was 22px, so those two went under 15px on an even wider stage. A 1280 desk gives multiply a stage of 901px and gives roots and the orbit a stage of 867px. A cut at 873px would have stacked those two films on that desk. The cite and the section label are now 23px. The longest cite line is 1163px of the 1208px row, so it still fits. Landscape starts at 835px, which is ceil(15/23×1280). Under 835px the page stacks, and that stack sets sentences at 16px and staircase steps at 15px. At 835px the 23px label renders at 15px. At the 867px desk it renders at 15.6px. At the 901px multiply stage it renders at 16.2px.

### Numbers

No console errors and no response at status 400 or above. Light background `rgb(246, 243, 236)`. Dark background `rgb(13, 18, 28)`. The iframe theme matched the site on all three films, both themes, all three widths.

Each film opened on its last frame: 10.0 s / 10.0 s, 11.6 s / 11.6 s, 17.9 s / 17.9 s. The button said Play.

At 1280 the layouts were wide: multiply stage 901px, smallest glyph 16.2px; roots and orbit stage 867px, smallest glyph 15.6px. At 700 and at 390 every film stacked. The smallest glyph was 16px on multiply and the orbit, and 15px on the roots staircase. A forced stage at 320, 390, 600, 700, 738, and 834 stacked, with the same 15px floor. At 835, 867, and 901 the page was wide and the smallest glyph was at least 15px. The page and the picture stayed within the width at every size.

Pause on multiply froze the label. The next 400ms scheduled 0 animation frames in the page and 0 in the site. The next click continued. From the end, the button said Play again, and that click started near 0s with the label Pause. Reduced motion stepped Next step at 10.0, 1.6, 4.5, 7.1, then Start again at 10.0, and the button never said Pause.

Badges at 1280, light: multiply `T1 · One point, two addresses`. Roots `T2 · The staircase` and `T1 · One point, two addresses`. Orbit `F1 · A sequence has a fate` and `F2 · Square, then slide`. Story Map is `#home`. The multiply row names roots and the orbit. The roots row names multiply and the orbit. The orbit row names multiply and roots, and both of those labels say Test 1.

The multiply cite and the roots cite say "PDF number not checked." On the orbit, Theorem 4.2.11 includes "PDF Theorem 4.9" and does not carry that flag. Example 4.2.12 and Exercise 8 do.

### Screenshots

- `/opt/cursor/artifacts/films-wide/1280-light-multiply.png`
- `/opt/cursor/artifacts/films-wide/1280-light-unity.png`
- `/opt/cursor/artifacts/films-wide/1280-light-orbit.png`
- `/opt/cursor/artifacts/films-wide/700-light-multiply.png`
- `/opt/cursor/artifacts/films-wide/700-light-unity.png`
- `/opt/cursor/artifacts/films-wide/700-light-orbit.png`
- `/opt/cursor/artifacts/films-wide/390-light-multiply.png`
- `/opt/cursor/artifacts/films-wide/390-light-unity.png`
- `/opt/cursor/artifacts/films-wide/390-light-orbit.png`
- `/opt/cursor/artifacts/films-wide/1280-dark-multiply.png`
- `/opt/cursor/artifacts/films-wide/1280-dark-unity.png`
- `/opt/cursor/artifacts/films-wide/1280-dark-orbit.png`
- `/opt/cursor/artifacts/films-wide/700-dark-multiply.png`
- `/opt/cursor/artifacts/films-wide/700-dark-unity.png`
- `/opt/cursor/artifacts/films-wide/700-dark-orbit.png`
- `/opt/cursor/artifacts/films-wide/390-dark-multiply.png`
- `/opt/cursor/artifacts/films-wide/390-dark-unity.png`
- `/opt/cursor/artifacts/films-wide/390-dark-orbit.png`

### Automated comments

Copilot's review on `aad6767` says the review quota was spent, and it contains no finding. Codex posted a failed review summary on the same commit, and a second comment that the usage limit was reached. The review threads are empty. There was no line to change from either bot. The findings of this pass are the spine and the type floor, and both are in this commit.

### Kit

`films` gained no keys. `js/core/film.js` and `kit/template/js/core/film.js` use the same 835 cut. `kit/SKILL.md` and `kit/mcp-tool.json` name that cut and the 15px floor. `kit/smoke.mjs` still checks pause, continue, replay, reduced motion, unmount, and 390px with no sideways scroll.

### Residues

- Principal roots left the roots film's link row. The roots page still points at Step 0. That stop is the home step, a different gesture from this turn.
- The orbit station's footer still links arithmetic as the slide by c, and it still links the paper. The film's arithmetic link is the turn. The two sentences sit on the same page on purpose.
- A finished film still opens on the last frame. Play from there starts at 0. That is the clock the close review accepted.
- At the 835px cut the section label is 15px, which is the floor. Below the cut the staircase steps are 15px as well.

### Verdict

READY TO MERGE. REFRAME ROUND: no.

The three observations are the right three, and they are now one turn. A reframe would invent a different motion. This is the motion the book already uses, from §1.4 through Theorem 4.2.11. The ideas have converged.

## Matrix, films, step, and the icon — close review

Branch `cursor/matrix-films-step-icon-20b3`, pull request 8, base `gh-pages`. Headless Chrome at 1280, 700, 390, and 360, light and dark. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. `npx wrangler deploy --dry-run` exits 0 and does not deploy. Screenshots: `/opt/cursor/artifacts/close-review/`.

### Verdict

PASS WITH FIXES.

### Fixes

The 180, 192, and 512 PNGs carried a cream square or ring behind a rounded tile. On a dark page that ring read as a broken white edge. Apple-touch is now a full-bleed navy square (`#1a2230`). iOS rounds the square itself. `icon-192.png` and `icon-512.png` are the same full-bleed square, with the mark scaled to 72% so it sits inside the maskable safe circle (80% of the diameter). Both manifest entries are `purpose: "any maskable"`. The favicon stays a rounded tile (`rx` 7) with transparent corners and no cream rim, so a light tab shows a dark squircle. Strokes are 4 user units. The orange wedge is a 45° sector of radius 13, painted after the strokes, so the angle still reads at 16 px. The in-page mark uses stroke 3.2, so the header stays a mark. `tools/make-icons.mjs` rebuilds the set and `media/icon-contact-sheet.png`.

Measured after the rebuild. Apple 180, icon-192, and icon-512: every corner and every edge midpoint is (26, 34, 48, 255). Cream pixels are the dot: 1009, 891, and 6551. `favicon.ico` is PNG-in-ICO at 16, 32, and 48. The 32 and 48 corners are alpha 0. The 16 px corners are alpha 1, and the lower rounded corners carry one antialiased navy pixel at alpha 12. The contact sheet pads each tile with 6 px of the row colour. That pad is the sheet. The PNG corners are navy.

The orbit film walked a live `c` for 8 steps. For `c = 0.3` that stopped at `|z₈| = 0.747`, and the sentence said the orbit stays bounded. Escape is step 12, `|z₁₂| = 2.193`. The live walk now continues until `|z| > 2`, a repeat, or 16 steps. The finished frame for the chip `c = 0.3` reads "This orbit leaves." The chip `c = i` still cycles through `−1 + i` and `−i` and reads "This orbit stays bounded."

The unity picture stayed on the five fifth-roots when the station's `n` changed. `draw(t)` now follows `n` from 2 to 12. At `n = 5` the lines are "Divide by 5" and "only 5 roots." At `n = 3` they are "Divide by 3" and "Step 3 lands on step 0: only 3 roots," and the staircase shows 0, 2π, 4π, 6π. Extra nodes use `svg.namespaceURI`. A literal SVG namespace URL fails the film asset check.

Multiply opens on problem 1.1.1: `z₁ = 3 − 2i`, `z₂ = −1 + 4i`, product `5 + 14i`. The hint and the film lede said that picture was the book's pair `√3 + i` times `1 + i`. They now say the film uses the `z₁` and `z₂` on this picture. The book pair is named when those two numbers are on the plane, and as the fallback when a film has no numbers yet. The open readout is `zw = 5 + 14i`.

### Checked and left as is

Step control on limits at 390, light. Slider 0 is 0.00001. Slider 1000 is 0.2. Slider 500 is 0.00141, against the geometric mean 0.001414. Typing 0.00001 and Enter sets the slider to 0. Blur of 0.0002 commits. The text "nope" reverts, and the hint is "Use a number from 0.00001 to 0.2." The value 1e-6 clamps to 0.00001 with "Kept inside". The step box stays inside the viewport. Invalid input reverts. A number outside the range clamps. That is the stepper contract.

The matrix, both maps, light and dark, at 1280, 700, 390, and 360. Test 1 is 4 rows and 19 chips. Test 2 is 4 rows and 14 chips. The scroll width equals the viewport at every size, including 360 on the staircase, Julia, and curves.

Motion at step 1e-5. The films (seam, settle, approach, newton-walk) schedule one callback about every 16.7 ms, and the longest gap was 16.8 ms. After pause has settled, the next 400 ms schedules 0 frames and the button says Play. The next click says Pause. A station picture that owns a plane (limits, curves, staircase, Newton) also coalesces one paint per plane, so one timestamp can carry two or three callbacks. The unique interval stays about 16.7 ms. Repeat, which has one clock, measured mean 16.7, min 16.6, max 16.8, and 0 frames in the quiet window after pause. A hidden tab was set with the frozen lifecycle state. This Chrome rejects the hidden state. `document.hidden` is true, `visibilityState` is hidden, and limits, still saying Pause, scheduled 0 frames.

Julia drag plus play at 0.00001 uses the coarse 96×96 fill under the 8 ms budget. During play the mean gap between callbacks was 8.2 ms, from the live tick and the plane paint, and the longest gap was 16.8 ms. After the path finished, the phase was done and the next window scheduled 0 frames.

Films at 390, portrait. The smallest glyph is 16 px, and 15 px on the unity staircase. Each new film opens paused on its last frame (8.0 / 8.0), with beats and readouts, and the iframe's GSAP ticker is asleep. Unity at 1280, dark, is wide, the smallest glyph is 23 px, and the iframe theme is dark. Settle reseed: `(1/2 + i/4)^n` reads "Settles at 0". The unit-modulus chip reads "Stays. The modulus is 1".

Assets return 200 at `/` and at `/math-viz/` for the favicon, the apple icon, the manifest, both PNGs, `404.html`, the CSS, and the JS. The manifest name, the relative start URL, and both purposes parse. The DOM has no hard-coded `/math-viz/`. The walk logged no console errors. The local test server answers an unknown path with the word "missing". That string is the harness. `404.html` is the product page, and wrangler `not_found_handling` is `404-page`.

Citations name the HTML sections that were opened: seam §1.4 Arg z, settle §4.1 Definition 4.1.1, approach §2.3 Definition 2.3.1, Newton step §4.2 Example 4.2.1, unity §1.5 Equation (1.5.5), multiply Equation (1.4.10), orbit Theorem 4.2.11 with PDF Theorem 4.9. Unchecked PDF numbers stay flagged. None were invented.

Hosting. wrangler 4.151.3, `deploy --dry-run`, read 258 paths, then ignored `.assetsignore`, `kit/`, `tools/` (including `tools/make-icons.mjs`), and `.git/`. The upload line is 0.35 KiB for the worker script. The tree has no `logs/` or `tests/` directory. The dry run exited without deploying.

The three-control ceiling is the kit's teaching cap on chips. The step group (slider, text, readout) is one control. Stations that already carry a richer set were left as they are. Crowding and sideways scroll were the checks.

### For the mid reviewer

1. Orbit verdict. The live walk now leaves at `|z₁₂| = 2.193` for `c = 0.3` and says so. The station's own sentence can be finer (settles, cycles, leaves). Read the film line against that chip.
2. Multiply honesty. The open picture is `3 − 2i` times `−1 + 4i`, product `5 + 14i`. The book pair is named when those numbers are on the plane.
3. Unity `n`. The picture retitles for `n` other than 5. The panel lede still says the film opens on the five fifth-roots, which is the opening state.
4. Icons. Apple and the two manifest icons are full-bleed navy, purpose `any maskable`, with the mark inside the safe circle. The favicon is the rounded tile with transparent corners. The contact sheet's 6 px pad is the row colour, and the PNG corners are navy.
5. Motion. Extra callbacks on a timestamp are the plane's coalesced paint. Unique gaps stay at one frame, including the Julia live path at 1e-5. A hidden tab was checked with the frozen lifecycle state.
6. The three-control ceiling was left as a cap on new chips. Stations that already have more chips were not stripped.
7. The hosting dry run ignores `kit/`, `tools/`, and `.git/`. It does not deploy.
8. The type floor holds at 390 (15 px on the unity steps, 16 px elsewhere). The wide unity page stays at 23 px.
9. Citations name the HTML sections that were opened. PDF numbers that were not checked stay flagged.

### Screenshots

- `/opt/cursor/artifacts/close-review/matrix-light-1280.png`
- `/opt/cursor/artifacts/close-review/matrix-light-700.png`
- `/opt/cursor/artifacts/close-review/matrix-light-390.png`
- `/opt/cursor/artifacts/close-review/matrix-dark-1280.png`
- `/opt/cursor/artifacts/close-review/matrix-dark-700.png`
- `/opt/cursor/artifacts/close-review/matrix-dark-390.png`
- `/opt/cursor/artifacts/close-review/step-invalid-390-light.png`
- `/opt/cursor/artifacts/close-review/step-1e-5-1280-dark.png`
- `/opt/cursor/artifacts/close-review/julia-1e-5.png`
- `/opt/cursor/artifacts/close-review/film-seam-390-light.png`
- `/opt/cursor/artifacts/close-review/film-multiply-390-light.png`
- `/opt/cursor/artifacts/close-review/film-unity-1280-dark.png`
- `/opt/cursor/artifacts/close-review/icon-contact-sheet.png`

### Verdict

PASS WITH FIXES.

## Matrix, films, step, and the icon — mid review

Branch `cursor/matrix-films-step-icon-20b3`, pull request 8, base `gh-pages`. Headless Chrome at 1280, 700, and 390, light and dark. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. `npx wrangler deploy --dry-run` (wrangler 4.151.3) reads 258 paths and exits without deploying. Screenshots: `/opt/cursor/artifacts/mid-review/`.

### Decision

This is one course. The Story Map is the book's walk, and it now sits above the matrix on both homes. The matrix is the other door: the same stops, grouped by what the picture shows, with the same row codes the map already prints on its banners. A film is the worked example of the gesture on that stop, with one Play. The same-move row is the chain across the two tests. The step control is the same group everywhere it appears.

### Fixes

The orbit film was saying "stays bounded" for every walk that had not escaped, including the ones the chip calls settles and cycles. The live line now uses the chip's three words. Blue is a walk that stayed. Orange is a walk that left.

- `c = 0` — chip "Settles at 0." Film "Settles at 0."
- `c = i` — chip "Stays. … it repeats." Film "Cycles: −1 + i, −i, … It stays."
- `c = −2` — chip "Settles at 2." Film "Settles at 2."
- `c = 0.3` — chip "Leaves." Film "Leaves." The readout names `|z₁₂| = 2.193`.

A walk that is still inside a disk after 16 steps, with no repeat yet, says "Stays. The steps remain in a disk." That is the chip's word for a bounded list that has not sat down. The theorem line in the lede still says "stays bounded." That is the theorem's word, and it is coarser on purpose.

Multiply opens on problem 1.1.1, `(3 − 2i)(−1 + 4i) = 5 + 14i`. The panel is titled "Worked example," and the cite is Equation (1.4.10). Figure 1.4.13 is named as the book pair, a special case, and the picture says "Problem 1.1.1. Figure 1.4.13 is the book pair." The plane fits the three arrows, so the landing `5 + 14i` is on the page. One button says Play. Pause froze the label at 0.3 s, and the next 400 ms left it there.

The unity lede and the sentence above the film no longer say the film is the five fifth-roots. They say the film divides by the n on the stop. The stop still opens at n = 5, and the picture then says "Divide by 5." Setting n to 3 retitles the picture to "Divide by 3" and "only 3 roots." The panel lede does not change, because it already follows n. The powers link says "raised to n."

The matrix stage labels were 0.78 rem, about 13 px. They are now `max(0.94rem, 15px)`, measured at 15.04 px. The short notes under a cell, and the step readout and its hint, use that same floor. The step readout had measured 14.72 px. Invalid text "nope" still reverts, and the hint is "Use a number from 0.00001 to 0.2." The default on limits is 0.02, written in plain digits.

### Checked and left as is

Icons. The page links `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, and `site.webmanifest`. The manifest names both PNGs `purpose: "any maskable"`, theme `#1a2230`, start `./index.html`. Apple 180, icon-192, and icon-512: every corner and every edge midpoint is (26, 34, 48, 255). Cream pixels are the dot: 1009, 891, and 6551. `favicon.ico` is PNG-in-ICO at 16, 32, and 48. The 32 and 48 corners are alpha 0. The 16 px corner is alpha 1, and one rounded corner carries an antialiased navy pixel at alpha 12.

Motion. `createFrame` keeps one callback. A second request while that callback is queued does not schedule another frame. I did not re-time the 16.7 ms gaps the close review measured. The code that produces them was not edited.

The three-control ceiling. `node kit/smoke.mjs` still rejects a fourth preset chip. The step group is one fieldset. Arithmetic and the other stations that already carry a richer set were not stripped. On multiply, the only Play on the page is the film's.

Hosting. The dry run read 258 paths, the same count as the close review, and the upload line is 0.35 KiB. `.assetsignore` still lists `kit/`, `tools/`, `logs/`, `tests/`, and `.git/`. It did not deploy.

Type at 390. Unity staircase steps are 15 px. Multiply and the orbit, stacked, are 16 px. At 1280 the multiply cite is 23 px. No page scrolled sideways at 1280, 700, or 390, light or dark.

Citations. Multiply names §1.4 Equation (1.4.10) and flags the PDF number. Unity names §1.5 Equation (1.5.5) and flags the PDF number. The orbit names Theorem 4.2.11 with PDF Theorem 4.9, and Example 4.2.12 and Exercise 8 stay flagged. No PDF number was invented.

Connective layer, on the stations opened. Addresses, arithmetic, roots, staircase, zero, sequence, and the paper have a map previous or a map next, and a lede. Limits' map neighbours are its T3 neighbours, so the footer says the thread and does not repeat the same stop. Julia and Newton add the thread previous and next beside the map link. Each film adds Story Map and at most four same-move links. Multiply names roots and the orbit. The orbit names Test 1 multiply and Test 1 roots. Unity names multiply and the orbit.

The matrix on Test 1 is four rows (R21, R2, R14, R11). Test 2 is four rows and 14 chips (R21, R14, R11, R16). The codes are the codes on the map banners.

### For the wide reviewer

1. The `c = i` chip still opens on "Stays," and the film opens on "Cycles." Both sentences carry the other word. If one headline is wanted, change the chip.
2. The matrix is a second catalog of the same stops. The map is now first, the lede defines Layout, Reveal, Transform, and Emphasize, and the row codes match the map. Watch whether a learner uses the board or walks past it.
3. The multiply plane fits the three arrows, so `5 + 14i` is on the page and the book pair is no longer a hand-tuned crop. Look at the angle arc on that long product.

### Screenshots

- `/opt/cursor/artifacts/mid-review/t1-map-light-1280.png`
- `/opt/cursor/artifacts/mid-review/t1-matrix-light-1280.png`
- `/opt/cursor/artifacts/mid-review/t1-matrix-dark-390.png`
- `/opt/cursor/artifacts/mid-review/t2-map-light-1280.png`
- `/opt/cursor/artifacts/mid-review/t2-matrix-light-700.png`
- `/opt/cursor/artifacts/mid-review/multiply-light-1280.png`
- `/opt/cursor/artifacts/mid-review/multiply-light-390.png`
- `/opt/cursor/artifacts/mid-review/multiply-dark-1280.png`
- `/opt/cursor/artifacts/mid-review/unity-n3-light-1280.png`
- `/opt/cursor/artifacts/mid-review/unity-dark-390.png`
- `/opt/cursor/artifacts/mid-review/orbit-zero-c-0-light-1280.png`
- `/opt/cursor/artifacts/mid-review/orbit-zero-c-i-light-1280.png`
- `/opt/cursor/artifacts/mid-review/orbit-zero-c-quarter-light-1280.png`
- `/opt/cursor/artifacts/mid-review/step-limits-light-390.png`

### Verdict

PASS WITH FIXES. Ready for the wide reviewer.

## Matrix, films, step, and the icon — wide review

Branch `cursor/matrix-films-step-icon-20b3`, pull request 8, base `gh-pages`. Headless Chrome at 1280, 700, and 390, light and dark. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Screenshots: `/opt/cursor/artifacts/wide-review/`.

### Throughline

One motion — an arrow turns by an angle and stretches by a length — done again, and the sentence flips: it settles, it stays, or it leaves.

That is what Test 1 and Test 2 teach together. Test 1 does the motion. Test 2 does it again and reads the fate. Newton’s colour is which root, the same sentence with a different ending.

### The mark on each page this pull request touches

The mark is the thing the learner’s eye is on. The sentence flips when that mark changes state.

- **Test 1 home.** The mark on the page is still the one dot and its two addresses. The angle sentence flips at the seam. The strip under the map does not flip. It names the three marks the rest of the course watches: the arrow, the stair, the latest step.
- **Test 2 home.** The mark is the colour of a walk, which the lede already says. The strip names the same three marks and points back at Test 1 for the turn.
- **Multiply (`#arithmetic`).** The mark is the arrow. The sentence flips from turn, to stretch, to land. The film opens on problem 1.1.1, `(3 − 2i)(−1 + 4i) = 5 + 14i`.
- **Powers.** The mark is the spiral, the same turn done n times. The chain points here. This pass did not redraw the page.
- **Staircase, seam film.** The mark is Arg, the name of the angle. The point stays smooth. The sentence flips when the name jumps a full turn.
- **Roots of unity.** The mark is the stair. The sentence flips when step n lands on step 0. The picture follows the n on the stop.
- **Sequence, settle film.** The mark is the term. The sentence flips: settles at 0, stays on the circle, or leaves.
- **Orbit of 0.** The mark is the walk from 0. The headline is Stays, Settles, or Leaves. For `c = i` both the chip and the film open “Stays. It cycles −1 + i, −i, …”.
- **Julia.** The mark is the filled set, and the green walk on it. The sentence flips from stayed to left as c moves.
- **Limits, approach film.** The mark is g(z) on the way into 0. A straight walk locks one direction. The spiral never settles. That is the flip.
- **Curves.** The mark is the point z(t). The sentence is where it is.
- **One Newton step.** The mark is the iterate. Five of them land on i.
- **Newton.** The mark is the colour. It flips among the roots, and to leaves when the walk does not land.
- **Repeat.** The mark is the latest footprint. At `c = i`, playing far enough flips the sentence from not yet to leaves.

### What was a side lesson

The matrix board was a second catalog of the same stops, sorted by how a film is built: Layout, Reveal, Transform, Emphasize. Those words are a production taxonomy. A learner does not watch them, and the sentence does not flip. The Story Map is already the catalog, in book order. The row codes had also been painted onto the map banners and the menu, so the exam walk was teaching the taxonomy too.

The board is now three rows, under the map, on both homes. The turn (Multiply, Powers). That angle, divided (the staircase, roots of unity). The same move, again (a sequence, the orbit of 0, Julia, Newton). A chip that leaves this test says Test 1 or Test 2, which is the switch the rest of the site already uses. The cell table stays in `js/data/matrix.js` as the classification record. It is not drawn. The map banners and the menu are the chapter and section names again.

The step control stays. It is how a walk moves, on the stations that already walk a quantity. It is not a lesson. The sentences that taught the step — on the seam, settle, approach, and Newton films, on the repeat panel, and the Julia note about frames and quanta — are cut. Julia’s line is now “Along the drag, 0.08.” A step under 0.04 still says “One coarse picture,” so the blur is not mistaken for the set.

### The three notes from the mid review

**One headline.** Stays. That is the fate word the flat paper, the sequence film, and the night-before plan already use. A cycle is what the steps do inside Stays, not a fourth fate. The chip opens “Stays. It cycles.” The film opens “Stays. It cycles −1 + i, −i, …”. Settles and Leaves are unchanged. The theorem line still says the orbit stays bounded. That word is the theorem’s, and it is coarser on purpose.

**The board.** It did not earn a second catalog. The chain above is what it earns: the motion the book order splits across two tests.

**The angle arc on 5 + 14i.** It reads. The radius follows |z|, the arrow being turned. A fraction of the whole view had swallowed z and w, because the product is long. On the opening frame the arrow to z is 72px, the turn wedge is 45px and sits inside that arrow, and the landing `5 + 14i` is 297px out and still on the plane. The line is −33.7° + 104° = 70.3°. The same frame at 390 keeps the wedge inside the arrow. The book pair is no longer the crop that hides this product.

### Bots

Copilot’s review is a quota notice. It names no line. Codex’s review did not run (the summary says the review failed, and the next comment is the usage limit). Neither left a finding to change. The reply on the pull request says so.

### Numbers

No console errors and no response at status 400 or above, at 1280, 700, and 390, light and dark, on both homes and on zero, arithmetic, Julia, limits, curves, the staircase, sequence, Newton, and the Newton step. Scroll width stayed inside the viewport on each of those (1265 at 1280, 685 at 700, 390 at 390). Matrix notes measured 15.04px. The `c = i` chip is pressed, and the film readout on that stop is the same “Stays. It cycles” line. Nothing on either home prints R21, R16, or Layout.

### Reframe

No. The homes, the films, and the stations already teach one motion and its fate. The catalog was the only piece offering a different structure, and it was the worse one. Another round would rebuild the site around a taxonomy the learner does not watch.

### Screenshots

- `/opt/cursor/artifacts/wide-review/t1-light-1280.png`
- `/opt/cursor/artifacts/wide-review/t1-light-700.png`
- `/opt/cursor/artifacts/wide-review/t1-dark-390.png`
- `/opt/cursor/artifacts/wide-review/t2-light-1280.png`
- `/opt/cursor/artifacts/wide-review/t2-dark-700.png`
- `/opt/cursor/artifacts/wide-review/zero-light-1280.png`
- `/opt/cursor/artifacts/wide-review/multiply-plane-light-1280.png`
- `/opt/cursor/artifacts/wide-review/multiply-plane-dark-1280.png`
- `/opt/cursor/artifacts/wide-review/multiply-plane-light-390.png`
- `/opt/cursor/artifacts/wide-review/multiply-station-light-1280.png`
- `/opt/cursor/artifacts/wide-review/multiply-station-light-390.png`
- `/opt/cursor/artifacts/wide-review/multiply-station-dark-1280.png`
- `/opt/cursor/artifacts/wide-review/limits-light-390.png`

### Verdict

READY TO MERGE. REFRAME ROUND: no.

## Films on M0.2j — close review

Branch `cursor/film-hostclock-m02j-ba63`, pull request 9, base `gh-pages` at `b993f00`. Headless Chrome at 1280, 700, and 390, light and dark, at `/` and at `/math-viz/`. `node tools/film-smoke.mjs`, `node kit/smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Screenshots: `/opt/cursor/artifacts/close-review/`.

### Verdict

PASS WITH FIXES.

### Fixes

The portrait stage wrote its own height from a ResizeObserver that was watching that same stage. Chromium then reported `ResizeObserver loop completed with undelivered notifications` on the window, which is a console error, on the narrow films. `js/core/film.js` and `kit/template/js/core/film.js` now watch a zero-height strip that is only as wide as the stage. `fit()` never changes that strip, so the height write does not schedule another observation and does not schedule a frame. After the change, every film at 1280, 700, and 390, light and dark, both prefixes, logged no window error, and the paused window was 0 site frames, 0 iframe frames, and a GSAP ticker delta of 0.

`tools/films/make_films.py` only emitted seam, settle, approach, and newton-walk when the matrix skill was missing. Multiply, unity, and orbit called `hfkit.page` directly and sat behind `if hfkit is not None`. Calling them also crashed: `JS_COMMON % json` treats the `%` in the portrait label positions as a format spec. Those three now use the same `.replace("%s", …)` the other four already used, and all seven go through `page_of` and `write_page`. `write_page` also drops a `controls.js` script if a future `hfkit.page(..., bar=False)` still emits one. A run with no skill wrote seven M0.2j pages to `/tmp/kit-film-pages`. Each has `data-layout="stacked"`, one `stack.js` before `window.__tl`, and `fit.js` then `hostclock.js` after it. The generated multiply page, opened at 390, is portrait, `clientWidth` 390, no sideways scroll, ticker asleep, 0 frames.

### Checked and left as is

The grid after the fix: seven films, three widths, two themes, two prefixes. Wide at 1280 (`data-stack` wide, page width 1280). Portrait at 700 and 390. `data-layout` stays `stacked`. `data-fitted` stays off, so fit.js did not scale the type. The iframe theme matches the page. The smallest measured glyph was 15.6 px on a wide stage (the 23 px cite scaled down to that stage) and 16 px in the portrait stack. Nothing in that set was under 15. The site and the iframe did not scroll sideways. No HTTP 404 turned up on those loads. A cancelled document navigation (`net::ERR_ABORTED`) is the hash change, and it was not counted.

Play, on a fresh page that was never frozen. `__hostclock.seek` takes 0 or 1 ms on every film, under the 80 ms stall in `createMotion`. Multiply, unity, orbit, seam, settle, approach, and newton-walk each reach about 0.4 s with the button saying Pause, freeze there with 0 frames, continue to about 0.7 s, say Play again at the end, and start again near 0.1 s. An earlier pass that froze the tab with `Page.setWebLifecycleState` left later films sitting at 0.0 s. That was the frozen page, not the seek. A separate multiply page, frozen while the button said Pause, drew 0 frames with `document.hidden` true, then was discarded.

Reduced motion, from the pass before the resize fix: every film opens on Next step, reaches Start again (multiply 4, unity 7, orbit 8, seam 3, settle 2, approach 2, newton-walk 3), draws 0 frames, and Start again returns to Next step.

Live numbers, same pass. Multiply follows `z₁` (`1` yields `−1 + 4i` on the film and on `#arithmetic-readout`). Unity `n` of 3 says only 3 roots. Orbit `c = 0.3` says Leaves. Settle's unit-modulus chip says Stays and the modulus is 1. Approach's spiral chip says the angle never settles. The open approach picture is the station's parabola, which is the right reseed. Seam's `1 + i` preset moves `r` from 2 to `√2`. Newton stays on `0.25 + 0.25i`. The host readout is `white-space: pre-line`, so a double space in the film's `textContent` collapses in `innerText`. The numbers match. The spaces are not a second bug.

Step `0.00001` on seam at 390 after the fix: the film shows it, and the ticker stays asleep. The earlier pass did the same for seam, settle, approach, and newton-walk at 390 and 1280, including the word "nope" reverting and slider 0 equalling 0.00001. The draw loops are a quantum, not a loop of `1e-5`.

The seek fallback stays. If a page has no `__hostclock`, the panel still does `__tl.progress` and `gsap.ticker.sleep`. `tools/film-smoke.mjs` requires that line. None of these seven pages take it. The old in-page glue is already gone: no `controls.js`, no `gsap.ticker`, no `dataset.layout = portrait`.

Citations. `js/data/films.js` has an empty diff against `b993f00`. The cite lines in the seven film pages are unchanged.

The trunk files were not edited. `hostclock.js` and `fit.js` each have a 3-line site header, then the vendored body. Body sha256: hostclock `fb9a482283a6bebdf5ada11f0c89aaeda0bdb5860b869eb1acd2f0af8e31a206` (6693 bytes), fit `e9bd3f295bbd9a013cbd04a4dc484a6f24a61c77e3dbf908de4370aa2504a75a` (3082 bytes). The tree `manim-hyperframes-matrix` is not on this machine, and GitHub code search returned 429, so this review did not diff those bodies against v0.4.4. They are unchanged from the pull request.

The kit. `kit/SKILL.md` already names M0.2j as the standard. One scaffolded film (`films/film-step.html`, host clock, stacked layout, stack.js in the head) opens paused at 4.0 s, plays, pauses with 0 frames, and at 390 stays portrait with no sideways scroll and no resize-observer error. `kit/smoke.mjs` covers the same clock on its own generated copy.

### For the mid reviewer

1. The resize error was the stage watching itself. The probe is a width strip. It does not keep a frame alive, and the paused grid is still 0 frames.
2. Seek is about 0 ms. The films that looked stuck at 0.0 s had been through a frozen lifecycle on the same page. The 80 ms stall in `createMotion` stays.
3. The generator now writes all seven pages with no skill installed. When the skill is present, `page_of` still calls `hfkit.page(..., bar=False)` and `write_page` strips `controls.js` and puts the M0.2j scripts back. Worth one look on a machine that has the skill. The `%` in the portrait label is why `%` formatting cannot fill `JS_COMMON`.
4. `__setFilmParams` stays in `stack.js`. M0.2j has no param channel, and a cross-origin host cannot call that function. A `setParams` message would be a trunk change.
5. Portrait reflow writes `data-stack`. `data-layout` stays `stacked`, so fit.js does not shrink the type. The measured floor held at these three widths.
6. The no-hostclock seek and `ticker.sleep` stay. The smoke test names that path. Do not delete it as dead glue.
7. A double space in a film readout collapses under the host's `pre-line`. Compare `textContent` if a line looks short. The numbers already agree.
8. Approach opens on the station's parabola. The spiral is the chip that says the angle never settles.
9. Trunk bytes were not compared with v0.4.4 here. The hashes above are the bodies after the 3-line header. Diff them before calling the files identical.
10. Citations are the same text as `gh-pages`.

### Screenshots

- `/opt/cursor/artifacts/close-review/retest-multiply-1280-dark.png`
- `/opt/cursor/artifacts/close-review/retest-multiply-390-light.png`
- `/opt/cursor/artifacts/close-review/retest-unity-390-light.png`
- `/opt/cursor/artifacts/close-review/retest-orbit-1280-light.png`
- `/opt/cursor/artifacts/close-review/retest-approach-390-light.png`
- `/opt/cursor/artifacts/close-review/retest-seam-700-dark-sub.png`
- `/opt/cursor/artifacts/close-review/retest-newton-walk-700-light.png`
- `/opt/cursor/artifacts/close-review/retest-settle-390-dark.png`
- `/opt/cursor/artifacts/close-review/retest-generated-multiply-390.png`
- `/opt/cursor/artifacts/close-review/retest-kit-film-390.png`

### Verdict

PASS WITH FIXES.

## Films on M0.2j — mid review

Branch `cursor/film-hostclock-m02j-ba63`, pull request 9, base `gh-pages`. The close review stopped at `bb7472d`. This pass also takes trunk v0.4.5's parameter channel, which shipped with its suites green. Headless Chrome at 1280, 700, and 390, light and dark, at `/` and at `/math-viz/`. `node tools/film-smoke.mjs`, `node kit/smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0.

### Verdict

READY FOR THE WIDE REVIEWER.

The seven films are the worked example on the stop. One Play. The host line reads as a sentence. The live numbers follow the station through `setParams`, and the same-move links are the ones already on `gh-pages`. A generated kit site is held to the same page. There is one clock and one param channel.

### Fixes

The seam film was a trailer after the sum theorem, and the approach film was a trailer after epsilon-delta. The seam slot now sits between the drag and the helix, full width, because a film inside the half-width column would go portrait at 1280. The limits slot sits between the path note and epsilon-delta. At 1280 the limits film starts at y 1866, the path note at 1755, and epsilon-delta at 4037. The staircase film starts at y 1916, the helix title at 3069, and the sum at 3976.

Two host lines stopped being sentences under `white-space: pre-line`. Settle now says `terms shown: 8, step 0.25`. Approach now says `step 0.02, distance parameter 0.02`. The generator emits the same two sentences. Lines that still read after the collapse (a comma, "along", "through", a parenthesis) were left, including the gap the film's nowrap uses.

`page_of` asks a skill whose `page()` accepts `host_clock` for `host_clock=True`, and also `bar=False` or `controls=False` when that signature has them. `bar=False` alone is the old M0.2i switch: it drops the play bar and does not load the host clock, so a skill that cannot take `host_clock` is not asked for a shell. `local_page` is already M0.2j. `write_page` still strips a `controls.js` tag, puts one `stack.js` before the timeline, and puts `fit.js` then `hostclock.js` after it. A fake v0.4.4-shaped `page` was called with both `host_clock=True` and `bar=False` and came out as one host clock and no play bar. An old `page(bar=…)` was not called.

Live numbers moved off `window.__setFilmParams`. Each film defines `window.__onParams`, which stores the frozen copy. `draw(t)` already reads `window.__filmParams`, and `setParams` then pauses and calls `tl.render(t, false, true)`. The panel calls `__hostclock.setParams`, and a refusal is `console.error` only. The kit template panel is the same file. The scaffold rejects a page with no `__onParams`. A parent-realm object is a plain object by `[object Object]`, because its prototype is not the iframe's `Object.prototype`. The first cut refused every station payload with `bad params` for that reason. Kit smoke caught it.

A unity page opened wide, then narrowed to 390 after `n` became 3, kept the hidden root labels at their wide pixel positions. `#k4` stuck out to 346px in a 288px frame, 58px of sideways scroll, light and dark, both prefixes. Portrait `.lbl.off` is now `display: none`. The same path then measures scroll 0. Opening at 390 was already 0. The other six films stayed at 0 through the reseed grid.

### Checked and left as is

The resize probe stays a zero-height width strip. The grid logged no console error and no HTTP 404. A paused film, before and after a params call, at all 84 cells (seven films, three widths, two themes, two prefixes), had iframe ticker delta 0 and 0 `requestAnimationFrame` calls inside the frame. `createMotion` still stalls 80ms. The panel does not sleep the ticker a second time on the host-clock path.

`data-layout` stays `stacked`. `data-stack` is wide at 1280 and portrait at 700 and 390. `data-fitted` stays off. The site does not scroll sideways. The iframe theme matches an explicit light or dark. One visible Play, the film's. "Walk toward 0" and "Walk one lap" are station walks, and the arithmetic Play stays hidden on multiply.

Live reseeds, both prefixes, and the picture agreed with the station. Multiply `z₁ = 1` gives `zw = −1 + 4i` (the film's minus is U+2212, the station's is a hyphen). Unity `n = 3` says only 3 roots. Orbit `c = 0.3` says Leaves. Seam's `1 + i` moves the dot from cx 487.9 (`r = 2`) to cx 425.5 (`r = √2`) and the name still jumps a full turn. Settle's unit-modulus chip says Stays and the modulus is 1. Approach opens on the parabola chip; the spiral chip says the angle never settles. Newton stays on `0.25 + 0.25i` and lands on `i`. Typing step `0.05` and pressing Enter makes the host line `step 0.05 through step 5`, with the ticker still asleep. The station payloads that were on the page are depth 1, at most a handful of keys, and a few dozen characters. Step is one more finite number. All of them pass depth 4, 64 keys, 256 values, and 4096 characters.

The limit checks on a live multiply frame: `prototype`, `constructor`, a `__proto__` key, `NaN`, a 5-deep object, and 65 keys each return `ok: false, error: "bad params"`. A throwing hook returns `__onParams threw` and does not render. A `setParams` from inside the hook returns `called from inside the hook`; the outer call still returns `ok: true` and the time stays put.

The no-hostclock branch stays: `__tl.progress` then `gsap.ticker.sleep`. Film-smoke names that line. None of these seven pages take it.

`fit.js` is the v0.4.4 body. Body sha256 after the 3-line header: `e9bd3f295bbd9a013cbd04a4dc484a6f24a61c77e3dbf908de4370aa2504a75a` (3082 bytes), the same hash the close review recorded. v0.4.5 did not change that file. `js/data/films.js` is untouched, so the citations and the same-move chains are the `gh-pages` text.

The three book films in `make_films.py` (`film_multiply`, `film_unity`, `film_orbit`) are still the static pages. The shipped HTML follows the station. Copying the generator over those three files would wipe the live numbers. The README says so.

### For the wide reviewer

1. `films/shared/hostclock.js` is the v0.4.4 body with the v0.4.5 contract implemented here. The attached `hostclock-0.4.5.js.txt` was not on this machine, so the body was not copied from it. Body sha256 after the 3-line header: `46436020847c58b959443037e1611b4cdcc9af98456d6e6b2364f946d0f942be` (10333 bytes). The trunk file was described as starting `47399d00`. If those bytes differ, replace the body, keep the site header on v0.4.5, and rerun the reseed grid. The behavior this pass checked: `setParams` deep-freezes a plain-JSON copy, calls `__onParams(params, t)` at call time, pauses, `tl.render(t, false, true)`, sleeps the ticker, and returns or posts `{hf:'state', …, ok, params}` or `ok: false` with `no hook`, `bad params`, `__onParams threw`, or `called from inside the hook`. Same-origin rules as seek. Depth 4 counts the root. 64 keys per object or array. 256 values in the tree. 4096 characters across keys and strings.
2. Do not regenerate `films/film-multiply.html`, `film-unity.html`, or `film-orbit.html` from `make_films.py`. Those three generator functions are still the book figures. The shipped pages follow `__filmParams`.
3. The host line is `pre-line`. The remaining double spaces (orbit's comma gap, seam's parenthesis, approach's "along", newton's "through") still read as sentences after the collapse. Settle's terms/step and approach's step/distance now have a comma because they did not.
4. The seam and approach films are full-width sections on the gesture, not inside a half column and not after the theorem. Look at the weight of that. A film in the staircase's half column would stack at 1280.
5. The no-hostclock seek stays because film-smoke names it. The scaffold rejects a page that is not M0.2j, so a generated site should not hit it.
6. Portrait `.lbl.off { display: none }` is what keeps a narrowed unity page from scrolling. A hidden root label otherwise keeps the wide `left` it was given.
7. `kit/template/js/core/anim.js` still differs from `js/core/anim.js` in comments only. The 80ms stall matches. Leave it.

## Films on M0.2j — wide review

Branch `cursor/film-hostclock-m02j-ba63`, pull request 9, base `gh-pages`. The mid review stopped at `34019a2`. This pass replaced the hand-written host clock with trunk v0.4.5 and watched the seven films. Headless Chrome at 1280, 700, and 390, light and dark, at `/` and at `/math-viz/`. `node tools/film-smoke.mjs`, `node kit/smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Screenshots: `/opt/cursor/artifacts/wide-review/`.

### Verdict

READY TO MERGE. REFRAME ROUND: no.

### The trunk file

`films/shared/hostclock.js` keeps the site's 3-line header naming v0.4.5. The body after that header is the attached trunk file, byte for byte. Body sha256 `47399d005b1a99cf13da5a23573dc5d054b69546be8444598be727bd57e53ed9` (10619 bytes). There is no second copy in `kit/template`. The kit copies `films/shared/hostclock.js` when it scaffolds.

### Trunk issue (for Report Generator)

Trunk v0.4.5 `clean()` accepts a plain object only when `Object.getPrototypeOf` is the page's own `Object.prototype` or `null`. A same-origin parent and its iframe do not share `Object.prototype`. On a live multiply frame, a parent-realm `{z1re, z1im, z2re, z2im}` returned `ok: false`, `error: "bad params: only plain objects and arrays"`. The prototypes differed. The same object rebuilt with the iframe's `JSON.parse(JSON.stringify(...))` returned `ok: true` and a frozen copy, and the playhead stayed at t = 10. The iframe's `structuredClone` did the same. `postMessage({hf:'params', params})` also returned `ok: true`, because the browser builds that object in the iframe before the handler runs. The direct call `iframe.contentWindow.__hostclock.setParams(parentObject)` is the one that fails, and that is the call this site makes. The trunk file was not edited. `js/core/film.js` and `kit/template/js/core/film.js` parse the payload with the iframe's `JSON` before `setParams`.

### Reseed grid

84 cells, 0 failures. Before the reseed and after it, the iframe asked for 0 frames and the GSAP ticker did not move. The site asked for 0 frames in that same quiet window. No sideways scroll on the site or in the iframe. `data-layout` stayed `stacked`. `data-fitted` stayed off. `data-stack` was wide at 1280 and portrait at 700 and 390. The iframe theme matched the page. The film button said Play. No console error and no HTTP 404. A cancelled hash navigation was not counted.

The numbers matched the station. Multiply `z₁ = 1` gives `zw = −1 + 4i` on the film (U+2212) and on the host line. Unity `n = 3` says only 3 roots. Orbit `c = 0.3` says Leaves. Seam's `1 + i` moves the dot from cx 487.9 to cx 425.5, and the name still jumps a full turn, at all three widths. Settle's unit-modulus chip says Stays and the modulus is 1. Approach opens on the parabola lock; the spiral chip says the angle never settles. Newton opens on `0.25 + 0.25i` and lands on `i`. Step `0.05` then Enter reads `step 0.05 through step 5` and still lands on `i`.

### The mark

The throughline is one motion: an arrow turns by an angle and stretches by a length, done again, and the sentence flips to settles, stays, or leaves. Each film puts that mark on the stop, and the live numbers move it.

Multiply. The arrow to z turns by the angle of w and stretches by the length of w. Changing z₁ to 1 flips the landing to `−1 + 4i`, and the line says the lengths multiplied. One Play.

Unity. The same turn, divided by the n on the stop. n = 3 flips the line to only 3 roots, and step 3 lands on step 0. At 390 after that reseed the page does not scroll sideways.

Orbit. Square, then slide, again. The line is the chip's word. c = 0.3 flips it to Leaves. The open picture is the chip, c = i.

Settle. z^n. The unit-modulus chip flips the line to Stays, and the modulus is 1. Inside the circle the same film says Settles.

Seam. The walk around 0. The point stays smooth and Arg jumps a full turn. That is the angle of the motion, on the staircase. The film is a full-width block between the drag and the helix (top 1919, height 1068 at 1280). A half column would stack it at 1280. The weight is the worked example of the lap, and Walk one lap remains the station's own walk.

Approach. The walk toward 0. The parabola locks g(z) to one direction. The spiral flips the line: the angle never settles. Full width, between the path and epsilon-delta. Walk toward 0 remains the station's walk.

Newton. Five steps from `0.25 + 0.25i` land on i. The line says so. Step 0.05 still lands.

### Cut

One sentence was about a picture the learner does not see. The orbit lede and `#zero-film-tie` said that with no chip yet the film walks c = i and then c = 0.3. The station always calls `setParams`, so the open frame is the chip. Those clauses are gone. The page still has the two-orbit drawing for a host that never sends params. The station does not describe it.

The rest of the panel stays. The thread badge, the cite, the same-move links, and the Story Map line sit under the picture. The links are the next time the same turn shows up. The host line is the film's numbers at the site's type size. The scrubber is the reduced-motion step. None of that covers the arrow.

### Mid-review items 2 to 7

2. Accepted. `film_multiply`, `film_unity`, and `film_orbit` in `make_films.py` are still the book figures. The shipped pages follow `__filmParams`. The README already says not to copy the generator over those three files.

3. Accepted. After `pre-line`, the host lines still read as sentences: orbit's comma, seam's parenthesis, approach's "along", newton's "through step". Settle and approach already have their commas.

4. Accepted. Seam and approach stay full width on the gesture. The measured block is the picture of the walk, and a half column would put the film in portrait at 1280.

5. Accepted. The no-hostclock seek stays. Film-smoke names `__tl.progress` and `ticker.sleep`. The scaffold rejects a page that is not M0.2j.

6. Accepted. Portrait `.lbl.off { display: none }` held. Unity at 390 after n = 3 had iframe sideways scroll 0, light and dark, both prefixes.

7. Accepted and left. `kit/template/js/core/anim.js` still differs from `js/core/anim.js` in comments only. Both stall at 80 ms.

### Automated review comments

Pull request 9 has no review threads. Copilot's review is a quota failure. Codex's review failed on a usage limit and left no findings. There was nothing to change for them and nothing to mark resolved.

### Verdict

READY TO MERGE. REFRAME ROUND: no. The films already show the one motion on the stops that carry it. Another organisation of the course would be a new map. These pictures agree with the sentence this map already teaches.

## Paths, zoom, and the Mandelbrot stops — close review

Branch `cursor/set-paths-zoom-2045`, pull request 10, base `gh-pages`. Head `f314044` plus the fixes below. Headless Chrome at 700 and 390, light and dark, on Julia, Newton, Mandelbrot, and the cardioid. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Screenshots: `/opt/cursor/artifacts/close-review/`.

### Verdict

PASS WITH FIXES.

### Fixes

A Fine slider rebuilt its window on every paint. A drag, or one arrow key, jumped across the whole range. `dress` in `js/core/set-tools.js` and `mountValueControl` in `js/core/stepper.js` lock the window on pointerdown and on the arrow keydown, ignore the input event that paint itself writes, and recenter on pointerup, keyup, or blur. `+` and `−` stay the step-sized control. One arrow is one tick of that locked window.

`formatStep(0.7885)` prints `0.788`, so the circle radius would commit a shorter number on blur. Value boxes use `formatValue`, which keeps `0.7885`. The step control still uses `formatStep`.

`buildVars` threw away every entry in `varControls`. The z₀ pair had been pushed into that list, and the first `loadFormula` then removed Re z₀ and Im z₀ from the page. Those two controls stay off that list. `refreshValues` paints the formula sliders and the z₀ sliders separately.

Pause incremented the worker token and returned before `busy` was cleared, so the sharp frame never went out and later frames stuck. The page now remembers the in-flight token, ignores a message for any other token, and `haltWorker` posts `{ op: 'cancel', token }`. Pause still asks for one sharp frame after the halt. A busy worker while the loop is playing coalesces to one pending draft instead of cancelling every frame. A hidden tab records the frame it owes and posts it when the tab is shown. `destroy` halts, drops the listener, and terminates the worker.

Newton’s deep reciprocal used only the high word of the divisor, so the “two doubles” line was false for the division. `ddRecipSum` and the Newton step in `js/core/deep-fill.js` divide with `ddDiv`.

Typing a width of `1e-40` already stopped at `1e-28`. Zooming there with `+` and `−` did not say so. `syncWindow` shows “Stopped at width 1e-28. Two doubles run out of digits past that.” and clears only that sentence on the way back out.

Julia wrote into the c boxes while they were focused, so a typed digit disappeared. It now skips the box that has focus, which Newton’s root box already did.

The path parser rejects a formula longer than 500 characters. Names are read from a null-prototype environment, and only as own keys, so `constructor` and `__proto__` are numbers rather than a walk up the prototype. `compileFormula` copies finite numbers into that environment. The source still has no `eval(` and no `new Function(`.

Reduced motion takes one step. The button says “One step”, not “Play” and not “Pause”.

The loop row can wrap, and it stays inside the page. The formula has a visible “Formula” label.

### Checked and left as is

The open row is Loop, Play, and Fine step. Window, K, R, and continuous zoom sit in More. z₀ stays in the open, because a step-sized nudge for the start is part of the gesture. Four chips stay: inside, disk, cusp, out on the set, and cardioid, period 2, basilica, out on the bulbs. At 390 none of them, and none of the sliders, run past the viewport. Scroll width was 0 at 700 and 390, light and dark, on all four stops. Every input in the view has a label, an aria-label, or both. `+` and `−` are buttons. Enter on minus steps c down by the step. ArrowRight on a fine slider from c = 0.5 lands on 0.50008, not on 0.

The circle preset exposes cx, cy, r, and the radius box reads `0.7885`. A bad formula (`2+`) stays up and says the formula ends early. Width `1e-40` stops at `1e-28` and says two doubles run out of digits. Width `1e-14` says “Two doubles.”

Drawn loops are already resampled by arc length. The smoke checks the gaps. A typed formula is c(t), with t the fraction of a turn. The circle `r*exp(2*pi*i*t)` is constant speed because the formula is. An ellipse or a cardioid formula is not, and it should not be reparameterized: the readout would then lie about t.

Escape, off-screen, and K points inside a disk of radius R are the three endings, plus the cap. K of 1 is raised to 2. The period after 240 steps is 1 at c = 0 and at c = 0.25, 2 at c = −1 and at c = −0.75, and 0 at c = 0.3.

Mandelbrot’s lede names Example 4.2.16, Theorem 4.2.11, PDF Example 4.11, PDF Theorem 4.9, and says the PDF number of Figure 4.2.13 was not checked. The source link is `sec_julia-mandelbrot.html#Disk__25_in_M`. The cardioid names Theorem 4.2.20, PDF Theorem 4.11, Definitions 4.2.17 and 4.2.18, PDF Definitions 4.9 and 4.10, and says higher bulbs are not outlined. Its source link is `#Fixed_point_Def`. At c = 0 the line says Period 1. Those pins match the HTML edition. Nothing in this pass invented a PDF number.

Map order is disk, Julia, the orbit of 0, Mandelbrot, the cardioid, the exercises. Mandelbrot’s map previous is `#zero` and its map next is `#bulbs`. The cardioid’s previous is `#mandelbrot` and its next is `#seeds`. F1 still steps from Mandelbrot to the exercises, because the cardioid is on F2.

The boundary film takes a parent-realm `{ re: -0.5, im: 0.1 }` (`ok: true`) and refuses an Array subclass (`ok: false`, “only plain objects and arrays”). Newton opens on the cube roots of 1, the unity chip pressed, and the sample guess reaches the purple root in 5 steps. The circle names are cx, cy, r, and z₀ is on the page.

A hidden tab adds no presents. Coming back posts the owed frames. Pause draws one more frame and then none. At 390 with the CPU slowed to 4×, the Mandelbrot loop ran 40 animation frames, the worst gap was 16.8 ms, and no long task was recorded. The bar was 50 ms for a long task and 80 ms for a gap.

No console error on the sweep. A cancelled document navigation was not counted.

### Automated review comments

Pull request 10 has no review threads. Copilot’s review is a quota failure. Codex’s review failed on a usage limit (`fb02f57`) and left no findings. There was nothing to change for them and nothing to mark resolved.

### For the mid reviewer

1. Typed paths are c(t). Drawn paths are constant speed. Do not arc-length a formula. The circle already has constant speed.
2. Figure 4.2.13 still has no PDF number. The page says so. Leave it until someone checks the PDF.
3. z₀ stays beside c. Window, K, R, and continuous zoom stay in More. The four chips fit at 390.
4. The Mandelbrot companion still fills on the main thread. This pass stayed under the long-task bar. If a slower phone hitches, cut that companion draft, not the worker cancel.
5. One fine arrow is one tick of the locked window. `+` and `−` are the step.
6. `loadFormula` still takes `keepValues` and does not read it. The environment is built from the current finite values either way.
7. `films/shared/hostclock.js` was not re-hashed here. `tools/film-smoke.mjs` still requires the v0.4.6 markers, and the live `setParams` check above is the parent-object case.
8. The film resize probe from pull request 9 is outside this zoom.

### Screenshots

- `/opt/cursor/artifacts/close-review/julia-700-light.png`
- `/opt/cursor/artifacts/close-review/julia-700-dark.png`
- `/opt/cursor/artifacts/close-review/julia-390-light.png`
- `/opt/cursor/artifacts/close-review/julia-390-dark.png`
- `/opt/cursor/artifacts/close-review/julia-390-light-controls.png`
- `/opt/cursor/artifacts/close-review/newton-390-dark-controls.png`
- `/opt/cursor/artifacts/close-review/mandelbrot-390-light-controls.png`
- `/opt/cursor/artifacts/close-review/bulbs-700-light-controls.png`

The same folder has the other station, width, and theme shots, including a controls frame for each.

## Paths, zoom, and the Mandelbrot stops — mid review

Branch `cursor/set-paths-zoom-2045`, pull request 10, base `gh-pages`. The close review stopped at `5ac7998`. This pass seated the new stops on the same-move row, matched the orbit disk to the matrix cells, and moved the companion Julia fill onto a worker. Headless Chrome at 1280, 700, and 390, light and dark, on the Test 2 home, Mandelbrot, the cardioid, Julia, and Newton. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Screenshots: `/opt/cursor/artifacts/mid-review/`.

### Verdict

PASS WITH FIXES. Ready for the wide reviewer.

### The throughline

One motion, done again. The sentence flips to settles, stays, or leaves. Newton’s colour is which root.

The Test 2 order is unchanged: the disk, Julia, the orbit of 0, Mandelbrot, the cardioid, the exercises, then Newton. Mandelbrot’s previous is The Orbit of 0 and its next is The Cardioid and the Period. The cardioid’s previous is The Mandelbrot Set and its next is Which c Keep 0 Bounded. Each of those four stops has a Story Map link. F1 still steps from Mandelbrot to the exercises, because the cardioid is on F2. The close review left that. It stays.

The home board draws `THROUGHLINE`, not the cell table. The row “The same move, again” now reads A sequence, Orbit of 0, Julia, Mandelbrot, Cardioid, Newton. The note says the Mandelbrot set is that sentence for every c, and the cardioid is where it settles. Seeds stay off the board. They are the exercises. Their summary used to say the cardioid is the next stop. It is the stop before. The summary says that now.

Mandelbrot and the cardioid grew an Earlier row, the same connective layer Julia and Newton already had. Mandelbrot’s three cards are Powers (polar: the turn and the stretch), Arithmetic’s add (cart: the slide), and Julia (input: the green walk). The cardioid’s three are the derivative (output: Equation 3.1.1, the same anchor the flat paper already uses, no new PDF number), Mandelbrot (cart: the set of c), and the orbit of 0 (input). The ledes lead with the fate words. The theorem word “stays bounded” stays on the theorem line.

### One module

Loop, Play, One step, and Fine step are `mountSetTools` in `js/core/set-tools.js`. The path picker, the formula, and the variable sliders are that module. More holds the centre, the width, zoom in, zoom out, continuous zoom, K, R, the orbit sentence, and Zoom to the cluster. `+` and `−` are the step. Julia, Newton, Mandelbrot, and the cardioid all call that one function. There is no second copy.

The loop row sits after the readout, under the picture. The step slider sits in the rule panel. On Mandelbrot and the cardioid the legend is Loop step, and the label is “Fraction of the loop each second, and the nudge”. Newton’s walk is a different gesture, so it keeps Walk step, “Fraction of a Newton step”, and Play the walk. Its loop has its own Loop step, the same legend and the same label, and `noteStep` listens to that slider only. The looped mark on Newton is a root, so the pad uses `--cart` and a filled dot. On the c-stations the path and the pad mark use `--polar`, and the mark is a hollow square. c is not blue. Green stays the walk from z₀. The picture overlay is `drawParamPath`. The handle is already the current point, so the overlay does not paint a second mark.

Julia’s slider stays Path step, “Distance along the drag”. The wide review locked that sentence, and the same number also drives the loop, the nudge, and the zoom. It was not split.

### The matrix cells

`study/c-path` was already this page: presets, a typed c(t) parser, and a slider for each free variable. `compileFormula` still copies finite numbers into a null-prototype environment. The source still has no `eval(` and no `new Function(`. A formula longer than 500 characters is still rejected. Drawn loops are still resampled by arc length. A typed formula is still c(t). It is not reparameterized.

`study/orbit-settle` was not the page. K defaulted to 5 and the floor was 2, which matched, but K had no ceiling and R defaulted to 0.25. Both now match the cell. `ORBIT_K_MIN` is 2, `ORBIT_K_MAX` is 64, `ORBIT_K_DEFAULT` is 5, `ORBIT_R_DEFAULT` is 0.001. The boxes and `orbitUntil` read those constants. A typed K above 64 is written back as 64. A bad R falls back to 0.001. The orbit line now leads with the fate word: Leaves, Settles, or Stays. A period-2 cycle does not fit in a disk of radius 0.001, so that orbit reads Stays. Period 1 at an attracting point reads Settles. Escape reads Leaves. `criticalPeriod` still uses its own tolerance of 0.001, and the period line still names the cycle.

### Close-review items

1. Accepted. Typed paths stay c(t). Drawn paths stay constant speed. The circle `r*exp(2*pi*i*t)` is already constant speed.
2. Accepted. Figure 4.2.13 still has no PDF number. Mandelbrot’s lede says “PDF number not checked.” The cardioid’s lede says “that figure’s PDF number was not checked.” Nothing in this pass invented one.
3. Accepted. z₀ stays beside c. Window, K, R, and continuous zoom stay in More. At 390 the page does not scroll sideways.
4. Done. The companion Julia beside Mandelbrot and the cardioid posts `{ kind: 'julia' }` to `js/core/set-worker.js` through `attachFractal`. The main still stays on the banded main thread, the same as Julia and Newton. The loop of the main picture keeps the worker `mountSetTools` already had. The companion has its own worker, so the two do not cancel each other. If `Worker` throws, the old fill and paint bands run. Pause, hide, and destroy cancel the companion token. At every width and both themes the companion canvas had a painted centre pixel, and the worker URL was `set-worker.js`.
5. Accepted. One fine arrow is one tick of the locked window. `+` and `−` are the step. The close review already locked the window.
6. Done. `loadFormula` no longer takes `keepValues`. The four call sites pass the formula only. A preset still writes its values before the load. A custom formula still keeps the current finite values.
7. Checked, not edited. `films/shared/hostclock.js` sha256 is `337ab42d404831909585139e8e8e0f553379faf4802543879abe336adbe6c65c`, 12446 bytes, the hash this pass was given. The header still names parent-realm `setParams` for v0.4.6. Film-smoke still requires the v0.4.6 markers.
8. Left. The film resize probe from pull request 9 is outside this zoom.

### Checked in the browser

Thirty cells: the Test 2 home, Mandelbrot, the cardioid, Julia, and Newton, at 1280, 700, and 390, light and dark. Scroll width matched the viewport on every cell. `data-theme` matched the requested theme. No console error and no HTTP error. Station ledes were 16.8px. The home lede was 21.6px. The home board had Mandelbrot and Cardioid. On the four stops, K was 5 with min 2 and max 64, R was 0.001, the labels were “Points in the disk (K)”, “Disk radius R”, “Centre, real”, and “Width”, More was present, and Loop and Fine step were present. Julia’s legend was Path step. Newton’s loop step was present and Play the walk stayed.

### Screenshots

- `/opt/cursor/artifacts/mid-review/t2-home-1280-light.png`
- `/opt/cursor/artifacts/mid-review/mandelbrot-1280-light.png`
- `/opt/cursor/artifacts/mid-review/mandelbrot-390-light.png`
- `/opt/cursor/artifacts/mid-review/bulbs-1280-light.png`
- `/opt/cursor/artifacts/mid-review/julia-1280-light.png`
- `/opt/cursor/artifacts/mid-review/newton-1280-light.png`
- `/opt/cursor/artifacts/mid-review/mandelbrot-1280-dark.png`

The same folder has the other station, width, and theme shots.

### For the wide reviewer

1. Julia’s one slider still says Path step and “Distance along the drag”. That number also drives the loop, the nudge, and the zoom. The wide review locked the sentence. Newton and the set-of-c stops say Loop step. Newton’s walk step is a separate control, on purpose.
2. F1 still skips the cardioid. Bulbs is F2 only. The close review accepted that. Do not add F1 to the cardioid to “fix” the thread.
3. Figure 4.2.13 still has no PDF number. Both ledes say so. Leave it until someone checks the PDF.
4. `films/shared/hostclock.js` was not edited. The full file matches `337ab42d404831909585139e8e8e0f553379faf4802543879abe336adbe6c65c` (12446 bytes). There was no separate trunk file on this machine to compare a body-after-header hash against. The whole file is the given hash.
5. The film resize probe from pull request 9 is outside this zoom.
6. R is 0.001, down from 0.25, and K now stops at 64. At the default window the cluster disk is smaller than a pixel. Zoom to the cluster still frames `8 * R`. A period-2 orbit reads Stays, because the two points do not fit in that disk. The period line still names the cycle. `criticalPeriod` keeps its own tolerance of 0.001.
7. A Mandelbrot or cardioid loop can run two workers: the main picture from `mountSetTools`, and the companion from `attachFractal`. They do not share a token. A still of the main picture stays on the banded main thread.
8. Typed paths stay c(t). Drawn paths stay arc-length. Do not reparameterize a formula.
9. Seeds stay off the same-move row. The board is the chain, not a second catalog.

### Verdict

PASS WITH FIXES. Ready for the wide reviewer. The new stops use the sentence the rest of the map already teaches, the controls are one module, and the orbit disk now matches the matrix cell.

## Paths, zoom, and the Mandelbrot stops — wide review

Branch `cursor/set-paths-zoom-2045`, pull request 10, base `gh-pages`. The close review stopped at `5ac7998`. The mid review stopped at `8a30f35`. This pass is the merge gate. It does not merge. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Headless Chrome, light and dark, at 1280, 700, and 390: Julia, the cardioid, Mandelbrot, Newton, and the Test 2 home. No console errors, no failed assets, no sideways scroll. Screenshots: `/opt/cursor/artifacts/wide-review/`.

### Verdict

READY.

### What the learner sees

Julia’s control is one step. The legend says Step size. The line under it says the drag samples at that spacing, and that the loop, the nudge, and each zoom use this step. Newton still has Walk step and a separate Loop step.

On the cardioid, c = −0.75 settles as period 2. At the companion’s size the two places overlap, the sentence says so, and Zoom to the clusters sits outside More. After that zoom the overlap sentence is gone and the disk radius has shrunk (about 0.070 to about 0.020 on a 1280 window). The two places are no longer one mark. c = −1 is the same period with the places already far apart. c = 0.4 on Mandelbrot, and c = 0.3 on the cardioid, read Leaves, and the Julia note says dust.

Loop on the cardioid starts on the cardioid path, not the circle. c rides the orange curve and the Julia set beside it changes shape. That path is the boundary, so the orbit of 0 often reads Stays: it has not landed in the screen disk, and no cycle of length 32 or less has shown up, while the Julia set stays one piece. The circle on Mandelbrot, and the c = 0.4 chip, are the crossing into dust. A cluster zoom is about the previous c. The next c puts the companion back on the whole set, so a leftover zoom does not call the new orbit Leaves.

A spiral at about −0.744 + 0.132i, width 0.02, is the deep picture. Width 1e-14 says two doubles. Width 1e-40 stops at 1e-28. The page does not scroll sideways there.

### MX alignment

Hand this to Matrix Master’s `study/orbit-settle` cell. The old fixed world default `R = 0.001` is gone.

- K is unchanged: default 5, minimum 2, maximum 64. A typed K outside that range is written back into range.
- Default R is 4 CSS pixels on the plane that draws the orbit, in world units: `R = 4 * unitsAcross / widthPx`. It is recomputed when that window changes, until the learner types a radius. A typed radius is world units and does not change with zoom. Clearing the box follows the screen again. There is no fixed world default. A caller with no screen passes R explicitly. Omitted or non-positive R does not cluster; escape and leaving the screen still end the walk.
- Settle when the walk has not escaped and has not left the screen, and the smallest period p in 1..32 satisfies both of these: the newest point lies within R of the point p steps back, and the K newest points of every residue mod p lie in a disk of radius R. The center of that window has moved by at most a quarter of a screen pixel since the previous K points of the same residue. A quarter of a screen pixel is `R/16`, because R is 4 pixels. A crawl that is still walking has not landed.
- A fixed point is period 1, one disk. A p-cycle is p disks. Consecutive points of a 2-cycle do not share a disk, so a separated period-2 orbit reads Settles, not Stays. If the two points of a 2-cycle do lie inside one disk of radius R, p = 1 closes first and the screen reads period 1. Zooming shrinks R. The period splits when the points no longer share a disk.
- The sentence leads with Leaves, Settles, or Stays and names the period. When the places of a period greater than 1 are closer than `3R`, the sentence says they overlap and points at Zoom to the clusters. The picture draws each criterion disk (radius R, not the spread) and the words “period p”. Zoom frames the disk that contains every cluster, 8 times that radius across.
- `criticalPeriod` is unchanged and is not this test. Tolerance 0.001, at most 32, 240 steps. The theorem line uses it. The on-screen sentence uses the disk test. They can disagree on a slow approach: the screen says Stays until the points have landed at this R, while the theorem line can already name a cycle.
- When `maxPoints` is omitted, the cap is `max(800, 32*K)`.
- A quadratic walk checks escape before any disk. Julia uses `|z| > max(2, |c|)`. Mandelbrot uses `|z| > 2`. If a quadratic call does not pass its own escape test, `orbitUntil` uses `|z| > 2`.
- A landing is Settles only when the product of `|f'|` over the last p steps is strictly below 1. For `z² + c`, `|f'(z)| = |2z|`. The product runs over the whole window, so a factor of 0 still counts: a superattracting cycle that passes through 0 settles. If the product is 1 or more, the same disks are drawn and the sentence says Stays. The cycle has closed on this screen and it does not attract. `c = i` (product `4√2`) and `c = −2` (product 4) are this case at every positive R. K is unchanged: default 5, minimum 2, maximum 64. R is unchanged: 4 CSS pixels until the learner types a radius.
- Newton uses the same disks and the product of `|N'(z)|` over the last p steps. Settles still requires that product to be below 1. The sentence calls the landing a root only when `|p(z)| ≤ 1e-4`. A point the Newton step has already snapped onto, within the station's squared tolerance `1e-4`, counts as `|p| = 0`. An attracting cycle that is not a root still says Settles, and the sentence adds that `|p(z)|` is not small, so it is not a root.
- A slow escape just outside the cusp can still read Settles. At `c = 1/4 + 1e-4` the orbit of 0 has a product just under 1 while the points sit inside the screen disk, and a longer walk leaves. The same happens at `1e-5`. R was not shrunk below a pixel to close that hole. `c = −0.75` still settles as period 2 on the screen disk.
- The vendored assembler is study/orbit-settle v2 (`js/playground/playground.js`, the same bytes as `tools/playground.js`, 65/65). It has no multiplier. At R = 0.02 the orbit of 0 agrees with the stations on c = −1 (Settles, period 2, step 19), the rabbit (Settles, period 3, step 29), c = −0.75 (Settles, period 2, step 208), c = 0.26 (Leaves, step 30), and c = 1/4 + 1e-4 (Settles, period 1, step 68). It disagrees where the product is at least 1: c = i Settles there (period 2, step 21) and Stays on the stations; c = −2 Settles there (period 1, step 11) and Stays on the stations. Same disks, same step. The station sentence says the cycle does not attract.
- An omitted R in the assembler is 4 px of its window, `4 * units_across / width_px` (0.025 on the default 4 units and 640 px). `R <= 0`, `R: null`, or `window: null` with R left out still means no clustering there. `orbitUntil` was not changed to match: a missing or non-positive R still does not cluster, and each station passes the 4 px screen radius. The playground page does the same through `orbitRadius`, and it does not pass `|f'|`, so the live void still follows the disk rule.
- K in the assembler throws unless it is an integer from 2 to 64. The station boxes and the playground box still write a typed K back into that range. That clamp stays.

### The shared token

One loop frame is one number from `createRenderEpoch`. `emitFrame` gives that number to the main worker and to `onTick`, and the companion `request` keeps it. A render yields once before it works. A job that is no longer the latest does not run. A small moving frame that has already started finishes; the page paints it only if nothing newer has painted. A sharp frame checks the token between bands. Pause asks for the sharp frame with the same number after playback has stopped, so the companion is not cancelled out from under that frame.

### What was left as decided

F1 still skips the cardioid. Bulbs is F2 only. Figure 4.2.13 still says the PDF number was not checked. Typed paths stay c(t). Drawn paths stay arc-length. Seeds stay off the same-move row. `films/shared/hostclock.js` was not edited.

### Residue

A small frame that has passed the initial yield finishes that picture. The page drops it only if a newer frame has already painted. Queued jobs that are no longer latest do not run. Copilot’s review is a quota failure and has no finding. There are no inline review comments. The pull request is mergeable into `gh-pages`. This pass does not merge.

## Playground — close review

Branch `cursor/playground-void-31d3`, pull request 11, base `gh-pages`. Zoom: the controls and the layout. The roll stays slow. The chrome stays small. Every picture names its formula and a real section. A new picture names one new idea. Verdict: **PASS WITH FIXES**.

`js/playground/playground.js` was not edited. It is still the same bytes as `tools/playground.js`. `node tools/check_vectors.mjs` is 57/57.

### Fixed

- A new picture sank, then the old one came back at full opacity for the whole bake, and only then the roll began. The stage now stays dark through the bake. The bitmap is cleared before the opacity returns, so the new ink starts from an empty void. The sink is 0.8 s even with reduced motion. Reduced motion drops the scale and the blur. It does not shorten the fade into a cut.
- The page turned itself. Forty-five seconds of looking called the next picture, and a level earned during the roll called another as soon as the ink settled. The first tap was also counted before the pick, so the opening picture could skip watch. The pick for the first picture happens first. Nothing advances until Begin or Next. The kicker names the picture on screen (`watch` for the opening Julia), not the level already unlocked underneath it.
- The opening line named two ideas. It is now `Square, then add c.` Later lines use the picker's own rule: one part that has not been seen, and the path axis does not count. A return that is not new does not say `New:`. The second picture in a fresh profile said `New: bands of whole steps.`
- `z^d + c` said `not in the course text` and gave no link. It now cites Howell & Mathews, Chapter 4, § 2, the same pin as the Julia set, and says the section draws the power 2. This picture is that rule with a higher power. No example number was invented.
- Light theme kept the night sky and then painted with the paper tokens, so the focus ring, the citation, and the ink were dark on navy. The sky now follows `--bg`. Dark is the night void. Light is the paper void, with dark specks instead of white stars. Type, the citation link, and the kicker clear 4.5:1 in both (link 5.57 light, 7.84 dark; kicker 5.46 light, 9.13 dark).
- `split-param` was placed in the two-column grid even though both panes are one bitmap. The picture sat in the left half. That grid is only for `split-sphere`, where the sphere is a second host.
- On the Mandelbrot plane, Up / Down / Left / Right changed `c` and the picture did not move. They now pan the window. Closer and Farther are hidden on the sphere and the height field, which have no window.
- A path laid its sliders in the open, beside the scrub. They sit in a closed `Path` disclosure. `Sharpen the period` was already closed. The scrub is one labelled range, `Along`.
- A tap on a picture that was already there recentred and rolled the same shape again. A tap now does the reveal, or nothing. Trace and verdict still use the point. A double-tap still flips the sphere.
- Keyboard and the screen reader had no way through drag, pinch, trace, or verdict. Enter or Space on the void is Begin. Arrows follow the gesture: move `c`, pan the window, scrub the path, zoom, or orbit a sphere when the buttons already move `c`. Plus and minus zoom when the picture has a window. Enter reads the centre for an orbit or a verdict. The caption and the badge are polite live regions. A visually hidden line names those keys. The stage describes itself with the caption.
- Next is `Begin` until the first shape, then `Next`. It is disabled while the void is writing, so a second press does not cut the roll.
- Enter AR / Enter VR stays hidden when `isSessionSupported` is false. A click does not call `requestSession` unless that check passes. A refusal leaves the line `No headset session. The shape stays in the void.` and hides the button when the runtime is gone. Headless Chrome produced no page error and no console error on that path.

### Checked and left as is

- `node tools/check_vectors.mjs` 57/57. `node kit/smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node tools/film-smoke.mjs` exit 0.
- Headless Chrome, fresh profile, light and dark, at 1280×800, 700×900, and 390×844. No sideways scroll. No console errors. No failed assets. Caption and citation contrast are at least 4.5. Tap targets are at least 44 px and sit inside the viewport. The footer at 390 is 189 px: formula, citation, six nudge buttons on one row, and Next are all inside it. At 700×500 the formula, the one hint, and Next still fit.
- Idle draws stay 0 for 700 ms before a touch and again after the roll (the counter does not move). Hiding the tab during the roll freezes the counter (6, then still 6). Device pixels are capped at 1.5: a claimed ratio of 3 produced a star canvas of 1200× for an 800 px css width.
- The opening roll on the dark 1280 window: mean alpha about 0 at 0.2 s, 2 at 0.4 s, 59 at 0.7 s, 152 at 0.9 s, 206 at 1.2 s, 255 at 2.3 s, then the 0.6 s settle. It is not a cut. Most pixels escape in a few steps, so the mean is high before the interior finishes. That is the diary key, low escape time first. Reduced motion climbs 25, 50, 73, … 253 with no scale and no blur.
- The CPU tier, WebGL2 removed, still rolls a cited Julia at 390, light theme. This machine's probe is gpu 0. A level-5 state then picks `poly/plane/smooth/nudge/roll/none`, not a height or a split. The caption is `New: the power can be 3, 4, or 5.` The citation names the power-2 section and the higher power.
- ArrowLeft on the opening picture moves `c` from −0.123 + 0.745i to −0.173 + 0.745i, which is one step of span/64. The second Next sinks (opacity down through 0.83, 0.63, 0.42, 0.21, 0) and the new roll starts at mean 0. The old picture does not pop back.

### Automated review comments

Pull request 11 has no review threads. Copilot's review is a quota failure. Codex's review failed on a usage limit and left no findings. There was nothing to change for them and nothing to mark resolved.

### For the mid reviewer

1. This machine's GPU probe is 0, so height, split-param, and split-sphere were filtered by R10 and were not watched as pictures. The split-param layout fix is the one canvas. The split-sphere grid was not filled by a real bake here.
2. The path plays by rebaking the whole field on a 32 ms timer. Idle and a hidden tab do not draw. A playing path does, on purpose. Whether that stays inside a frame on a phone is still open.
3. Deep zoom still slices the CPU bake on the main thread. The spec's float64 worker and 64×64 tiles are not in this page.
4. No headset was attached. Hit-test placement, hands, and controllers were not run. The button stays hidden, and a forced click fails into the quiet line.
5. The diary curve spends the first half-second on the fast exterior. The interior, stored at the top of the key, arrives late. That matches "low escape time first". A reader who wants the set itself to lead would be asking for a different curve.
6. `shortTitle` still cuts the story-map dot at the colon, so the dot reads Experimental. The button and the menu use the full name. `index.html`, `js/app.js`, `css/theme.css`, and `js/data/textbook.js` were not edited, so the Julia-path branch can rebase.

## Playground — mid review

Branch `cursor/playground-void-31d3`, pull request 11, base `gh-pages`. Zoom: does the void belong to the site, and does it still feel like one room of Test 1. Verdict: **accept with fixes**.

The assembler was not edited. `js/playground/playground.js` and `tools/playground.js` are the same bytes. `node tools/check_vectors.mjs` is 57/57.

### Fixed

- The story-map dot said Experimental because the title was `Experimental: Playground` and the shared `shortTitle` cuts at the colon. The place is now named **Playground**, which is what that cut is for: the name, then the idea. The home button, the menu, the page title, and the dot all say Playground. The summary says it is not a Next stop, which is the real status. `shortTitle` was not edited. Map, from the void, writes `mv:map` to Test 2 before it opens `#home`, so the return lands on the map that lists this stop.
- Each picture names the station that teaches it, after the book pin. Julia and a higher power go to Julia Sets. The parameter plane and a Mandelbrot picture go to Which c Keep 0 Bounded. Newton goes to Newton Fractals. The sphere goes to 1/z and the Sphere. A verdict goes to A Sequence Has a Fate. A traced orbit goes to Do the Motion Again. The book line is still Howell & Mathews, Chapter 4, § 2, with the same pins the stations use.
- The opening line is `Square, then slide by c.` Slide is the course's word for the move. The Mandelbrot line is the orbit of 0, one pixel for each c. Newton is which root the walk finds. The sphere says infinity is a place. A verdict says the walk stops when it settles or leaves. Those are the station sentences, one new part at a time. The four inks are unchanged: blue stays, orange leaves or marks c, green is the trap, purple is the third root.
- The GPU probe counted every frame after the first as a failure. `alloc` returned nothing when the framebuffer was already the right size, and `probe` treated that as a miss, so the median was a failure and the tier stayed 0 on any machine with WebGL. It now returns true. Headless Chrome with SwiftShader is honestly slow (the raw tier is still 0, median at least 25 ms). When `navigator.webdriver` is set and a WebGL2 context exists, the tier is floored at 1 so R10 does not hide the pictures. A learner's browser is not webdriver, so a slow laptop still drops height and the splits. `?gpu=1` or `?gpu=2` raises the tier only in that same headless or SwiftShader case.
- With that floor, the pictures were watched. Split-param is one bitmap: the Julia on the left, the parameter plane on the right, the orange ring on c. Split-sphere is the two-column grid: the plane in one half, the sphere in the other, infinity toward the camera. Height is the coloured potential sheet, normal-lit, at the spec's `min(G, 2) * 0.6`. It reads shallow. The scale was left alone. The sphere, a Mandelbrot plane, and a Newton basin were watched on the same pass. Light and dark, at 1280×800, 700×900, and 390×844: no sideways scroll, no console errors, no failed assets, idle draws stay 0, Next is 44 px.
- A playing path no longer keeps a second 32 ms timer. The play clock is `motion.drive`. A rebake starts only when c or the window has moved by a visible step (span/256), and a bake already running keeps the latest request instead of stacking. A 12 s circle on this GPU repainted 23 times in 700 ms, which is one rebake per visible step, not a timer firing under a still picture. Idle before Begin stays at 0 draws.
- Deep zoom below span 2e-5 leaves the float32 shader and bakes in `js/playground/zoom-worker.js`: float64, tiles of 64, px_scale 0.5, long side held at 256. A newer zoom cancels the tile loop at the next yield. At span 1.5e-5 the page reported `data-bake="worker"`, the picture filled, and there was no console error. The main-thread CPU slice remains the fallback when the worker fails, and the tier when there is no WebGL2.

### Decisions

- The diary should not lead with the interior. Low escape time first is the course's order: the walk that leaves writes itself first, and the set is what stayed. Leading with the interior would show the conclusion and then spray the fate around it. The curve the close review measured stays. The first half-second is the exterior. The interior, at the top of the key, arrives late, on purpose.
- The picker was not retuned. Watch is the Julia the course draws first. Walk brings the parameter plane and the word settles. Turn brings Newton and the sphere. Shape, last, is the height, which the course does not draw. That is easy to hard in the course's order. Levels live in the assembler, so they were not a knob on this pass.
- The Mandelbrot link is Which c Keep 0 Bounded. On this branch that station states the set and does not draw it. The playground is the drawing. If pull request 10 adds a station that draws the set, the wide pass should point this link at that id.

### Shared files, for the rebase onto pull request 10

Pull request 10 merges first. These are the only edits outside the playground page:

- `js/registry.js`: the `playground` station only. Title `Playground`. Summary ends `It is not a Next stop.` The object is the last entry in `STATIONS`.
- `js/stations/home-test2.js`: the label of `#home-open-playground` only, now `Playground`.

Not edited, so a rebase that does not touch those two spots is mechanical: `js/playground/playground.js`, `tools/playground.js`, `tools/check_vectors.mjs`, `tools/test_vectors.json`, `tools/PLAYGROUND_SPEC.md`, `shortTitle` in `js/stations/problems.js`, `index.html`, `js/app.js`, `css/theme.css`, `js/data/textbook.js`.

### Checked

- `node tools/check_vectors.mjs` 57/57. `node kit/smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node tools/film-smoke.mjs` exit 0.
- Headless Chrome, SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`), fresh profile, light and dark, at 1280×800, 700×900, and 390×844. The story map at 1280 and at 390 shows the dot Playground and does not show a lone Experimental. The home button is Playground and opens `playground.html`.

### For the wide reviewer

1. No headset was attached. Hit-test placement, hands, and controllers are still behind Enter AR / Enter VR. The button stays hidden here, as the close review left it.
2. The height sheet is coloured and lit, and the relief is the spec's 0.6. On this camera it reads as a shallow sheet. Do not rescale it to make a taller mountain. A lower camera is a picture choice, and it can wait.
3. A playing path on this GPU repaints once per visible step. A phone on the CPU tier will take longer per bake and should coalesce to the latest step. That phone was not in the room.
4. Deep zoom was watched at span 1.5e-5, not sat on the 1e-12 floor and the line `deep as it goes`.
5. If pull request 10 adds a Mandelbrot station that draws the set, point the playground's Mandelbrot link at that station. It is seeds today.
6. The webdriver floor is only so a headless pass can see height and the splits. It must not become a way for a slow device to skip R10.

## Playground — wide review

Branch `cursor/playground-void-31d3`, pull request 11, base `gh-pages`. The close review stopped at `a8d9410`. The mid review stopped at `856466f`. Pull request 10 is on `gh-pages` at `b500525`. This pass brought that tip in with a merge commit, `be4c5c2`, and did not rebase or force-push. It does not merge the playground. `node tools/check_vectors.mjs` is 57/57. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Headless Chrome, SwiftShader, light and dark, at 1280×800, 700×900, and 390×844: the Test 2 home, Mandelbrot, the cardioid, Julia, Newton, and the playground.

### Verdict

READY.

### The merge

`gh-pages` at `b500525` is an ancestor of this branch. The conflict was three files. `REVIEW_LOG.md` and `RESEARCH_LOG.md` keep both histories. `tools/fractal-smoke.mjs` keeps the path-and-zoom checks and adds the two playground lines (the Mandelbrot station link, and the shared screen disk). `js/registry.js` still ends with the playground station, title Playground, and the summary still says it is not a Next stop. `js/stations/home-test2.js` still labels `#home-open-playground` Playground. The assembler was not in the conflict and was not edited. `js/playground/playground.js` and `tools/playground.js` are the same bytes.

### Where the void sends the learner

The Mandelbrot picture and the parameter plane now say Taught on The Mandelbrot Set, `index.html#mandelbrot`. They no longer point at seeds or at Which c Keep 0 Bounded. A cardioid or period-2 loop says This loop is taught on The Cardioid and the Period. A verdict still goes to A Sequence Has a Fate. A Mandelbrot verdict also names the period on the cardioid. A traced orbit still goes to Do the Motion Again. The sphere still goes to 1/z and the Sphere. Julia and a higher power still go to Julia Sets. Newton still goes to Newton Fractals. The book pin is still Howell & Mathews, Chapter 4, § 2.

### The same disk as the stations

The page no longer keeps its own settle. A tap that asks for an orbit calls `orbitUntil` from `js/core/orbit-settle.js`. Default R is `radiusInWorld` of 4 CSS pixels (`ORBIT_R_PX`) on the pane that draws the orbit. It is recomputed when the window changes, until the learner types a radius. A typed radius stays in world units. Clearing the box follows the screen again. K stays 5, from 2 to 64. A cluster is the fate word Settles, and the lead sentence is the first two sentences of `orbitSentence`, so a period names itself: Settles. Period p. The picture draws one disk per place, radius R, and the words period p. Zoom to the clusters frames 8 times the disk that holds every place. One disk says Zoom to the cluster. On a 390×844 window the basilica, c = −0.75, reads `Settles. Period 2. The last 5 points of each place sit inside a disk of radius 0.01516588.` The page does not scroll sideways, and Next stays on the screen. A Mandelbrot picture is the orbit of 0 for every c, so the probe orbit is not drawn on top of that plane. The parameter plane beside a Julia still marks c.

### What a learner feels, L0 to L5

The opening line is still one idea: Square, then slide by c. The roll stays the diary key the close review measured, low escape time first, and nothing advances until Begin or Next. The kicker names the level of the picture on screen: watch, touch, walk, dive, turn, shape.

When the picker has a new part, the caption names that one part (`New:` once). When the picker has nothing new, the old caption repeated a shape the learner had already seen, or went quiet, and the next level had no door. The caption now names the one gesture that opens the next shape.

- Watch, level 0. Touch the void once more.
- Touch, level 1. Drag c three times, and tap once for the orbit. Whichever of those is still missing is the line.
- Walk, level 2. Scrub the path twice, and tap twice for the verdict. The verdict line is the course's sentence: settles, stays, or leaves.
- Dive, level 3. Close in. Three pinches, or one long zoom.
- Turn, level 4. See a few more pictures, then leave and come back. The last shape waits.
- Shape, level 5. The same shapes, one step on.

If the unlocked level is already ahead of the picture, the line is Next brings a new idea. A return that is not new does not say `New:`. Each of those lines is one next act, and the citation under the formula is the station that teaches the picture already on screen. The void is the drawing. The station is the lesson. The four inks are unchanged: blue stays, orange leaves or marks c, green is the trap, purple is the third root.

The webdriver floor is unchanged and still applies only when `navigator.webdriver === true`. A learner's slow GPU stays at the probe. `?gpu=1` and `?gpu=2` raise the tier only in that headless or SwiftShader case.

### Checked

- Assembler bytes identical. `node tools/check_vectors.mjs` 57/57.
- `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, and `node tools/fractal-smoke.mjs` exit 0. Fractal-smoke includes the Mandelbrot link and the shared screen disk.
- Headless Chrome, fresh profile, light and dark, at 1280, 700, and 390. Home is Test 2, the button says Playground and opens `playground.html`, and there is no lone Experimental. Home names the set and the cardioid. Mandelbrot's sentence, the cardioid's period 1, Julia's slide, and Newton's root are on the page. Scroll width matched the viewport on every cell. No console error.
- The playground at 390: the basilica settles as period 2, the draws stay still after the roll (83, 83, 83), and the page does not scroll sideways.

### Mid-review items

1. Accepted as residue. No headset was attached. Enter AR / Enter VR stays hidden when `isSessionSupported` is false. Hit-test placement, hands, and controllers were not run. WebXR is unverified.
2. Accepted and left. The height sheet stays at the spec's `min(G, 2) * 0.6`. It reads shallow. It was not rescaled.
3. Accepted. A playing path rebakes on a visible step and keeps the latest request. A phone on the CPU tier was not in the room.
4. Left. Deep zoom was not sat on the 1e-12 floor in this pass. The worker path from the mid review is still the one below span 2e-5.
5. Done. The Mandelbrot link is `index.html#mandelbrot`, The Mandelbrot Set.
6. Accepted. The floor is `navigator.webdriver === true` only.

### Residue

WebXR is unverified. The height relief was left at the spec. A phone on the CPU tier was not timed. The line `deep as it goes` was not sat on. Figure 4.2.13 still says the PDF number was not checked, which pull request 10 left on purpose. Pull request 11 has no review threads. Copilot's review is a quota failure. Codex's review failed on a usage limit and left no findings. This pass does not merge.

## Rendered films and the multiplier — close review

Branch `cursor/rendered-films-settle-f114`, pull request 12, base `gh-pages`. Zoom: the controls and the layout. Headless Chrome, light and dark, at 1280, 700, and 390, plus the cut at 599 and 600. Play was pressed on both films. The playground was opened after the assembler swap. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. Verdict: **accept with fixes**.

### Fixed

The Picture legend was 0.78rem (12.48px) and the film credit inherited the site source tag at 0.82rem (13.12px). Both are now `max(0.94rem, 15px)`. Measured 15.04px at 1280 light and at 390 dark. The sitewide source tag was left at 0.82rem.

A focused radio had no ring a keyboard user could see. The chip label now draws a 3px solid ring on `:focus-visible`, and the input’s own outline is suppressed so the ring is the chip. ArrowRight from Live lands on Rendered film. The accessible name is “Rendered film”. ArrowLeft returns to Live. After Play, focus sits in the video and the arrows scrub, which is the native control. Focusing the radio again, then ArrowLeft, returns to Live and pauses the film.

While Rendered is selected, the preset chips, the typed c and z fields, and the loop step are hidden. They edit the live picture. The film does not follow them, and the return to Live replaces c with the frame, so a number left on screen would be a lie. The rule text stays. The loop row, the path panel, and More already hide with the loop host. The live loop pauses when the film is chosen.

Chrome picks a `<source media>` once. A resize across 600 kept the first file, and Play decoded that file. The poster already followed the window. When the pick is wrong and nothing has buffered, `src` is pointed at the cut for this window with `preload` still `none`, so the name changes and the file waits for Play. When a cut is already buffered, `preload` is set to `auto` for that assignment, the other cut loads, the time is restored, and a film that was playing continues. A resize before Play does not fetch an mp4.

Period 1 always said “A fixed point attracts. That is the main cardioid of Theorem 4.2.20.” At c = −2 the multiplier guard has already said Stays, so that line was false. When the orbit reason is `closed` and the period is 1, the line is now “Period 1. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.2.20.” c = 0 still says the fixed point attracts.

### Checked

Live opens. Nothing autoplays. Each video is muted, has controls, plays inline, and has `preload="none"`. The poster matches the cut. No mp4 is requested before Play. At 1280, 700, and 600 the decoded frame is 1280×720 and the current source is the landscape file. At 390 and 599 the decoded frame is 720×1280 and the source is the portrait file. After Play, `currentTime` advances, `paused` is false, and `readyState` is 4. Light and dark. Scroll width was 0 at 1280, 700, and 390.

Hiding the tab pauses. In this headless Chrome, `Page.setWebLifecycleState` `hidden` is refused and `active` does not clear `document.hidden` after `frozen`. `frozen` sets `document.hidden`, fires `visibilitychange`, and the handler pauses and holds `currentTime`. A following visible event calls `play()` and the time continues. It does not rewind. Leaving the station pauses, removes both sources, and drops the element. No console error.

Returning to Live after the film has moved seeds c from the nearest log row and the picture updates. Mandelbrot at t = 15.5 seeds c = 0.45 + 0i and the readout says Leaves. The cardioid at t = 6.6 seeds c = −0.125 + 0.649519i. Loop off stays off. Loop on stays on, and with the cardioid path still selected the loop turn is that frame. The chips, the fields, and the step come back.

The on-screen sentence matches the station rule. c = 0.26 Leaves on step 30. c = i says `Stays. Period 2.` and “the multiplier is not below 1, so the cycle does not attract.” c = −2 says `Stays. Period 1.` and the same refusal, and the period line says the point does not attract. c = −0.75 Settles, period 2. The rabbit centre Settles, period 3. c = 0 Settles, period 1, and says the fixed point attracts. The table in `RESEARCH_LOG.md` is the same rule at screen R = 0.02 (`radiusInWorld(4, 800)`). On the live companion at 1280 the disk was about 0.07, because the pane is narrower than 800. The verdicts still matched. c = 1/4 + 1e-4 and c = 1/4 + 1e-5 remain the false Settles the log already records. R was not shrunk under a pixel.

The credit reads “Rendered with Manim.” and links Howell & Mathews, Chapter 4, § 2. The cardioid cite is the fixed-point anchor, Theorem 4.2.20. The Mandelbrot cite is Example 4.2.16.

The playground still rolls. A fresh Chrome went `roll`, then `settle`, then `idle`, and the ink was on the canvas. A forced verdict at c = −1 reads `Settles. Period 2.` No console error on the station passes or on the playground. The first playground probe stayed in `roll` only because that Chrome target was still lifecycle-frozen from the hide test. A fresh target rolls.

`node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node tools/rendered-check.mjs` exit 0 on this tree. `node tools/check_vectors.mjs` is 65/65. `rendered-check` covers 1280, 700, and 390, light and dark, both stations, including the 15px floor, and it does not press Play. Play is the probe above.

### Decisions

The 15px floor is only the film legend and the film credit. The keyboard ring is on the chip, and only for a visible focus. Live controls that cannot drive the mp4 hide while the film is up. The playground does not grow a multiplier in this pass. The assembler, `hostclock.js`, and the film bytes were not touched.

### For the mid reviewer

The playground and the vendored assembler still settle a repelling cycle. They call `orbitUntil` with no `|f'|`. c = i and c = −2 say Settles there and Stays on the stations. That split is written in `RESEARCH_LOG.md`. Do not add the multiplier to the assembler.

Mandelbrot still shows the HyperFrames boundary film under the Manim player. It is a different control. It was left.

`criticalPeriod` can still name a cycle while the disk says Stays on a slow approach. Only the false “attracts / main cardioid” line for reason `closed` was changed.

The on-screen disk radius follows the companion width. The research table is R = 0.02 on an 800px window. A 1280 window here used about 0.07. The words match. The number in the sentence will not match the table.

Figure 4.2.13 still has no PDF number. That is outside this zoom.

A real monitor hide was not in the room. The pause path is the `visibilitychange` listener, and that path was run.

### Residue

Pull request 12 has no inline review threads. Copilot review 5625446669 is a quota failure and left no findings. Codex comments 6360232672 and 6360233179 failed on a usage limit and left no findings. Nothing to resolve on a line. This pass does not merge.

## Film C — close add-on

Branch `cursor/rendered-films-settle-f114`, pull request 12, base `gh-pages`. Same branch as the close review. Film C is the 19 s Mandelbrot deep zoom, a period-70 minibrot. It sits on the Mandelbrot station as a second rendered film. The cardioid station is unchanged. The assembler was not edited. Both copies are still `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. Verdict: **accept**.

### What was added

The Picture switch is still Live / Rendered film. Rendered opens a Film picker: Leaving into dust, and Deep zoom to a minibrot. Leaving is the one that opens, so the station still starts on Film B. The picker is hidden on Live. Both chips are radios in one group, so the arrows move between them, and the label is the accessible name. The Film legend uses the same 15 px floor as Picture.

The files are `media/films/minibrot-1280x720` and `minibrot-720x1280`, mp4 and png, plus `minibrot-frames.jsonl`. Sizes match the README: 3079740, 2921057, 577005, 629820. Both cuts are 19.0 s, H.264, 1280×720 and 720×1280. The video is muted, has controls, plays inline, and has `preload="none"`. The poster is the end hold. Nothing autoplays. A resize across 600 retargets the file and does not fetch it before Play. 599 px is the portrait cut. 600 px is landscape.

The credit says “Rendered with Manim.” Film B still links Howell & Mathews, Chapter 4, § 2. Film C links Wikimedia Commons, File:Mandelbrot_sequence_new.gif, and says that file picks the neighbourhood and the period-70 nucleus is this picture’s Newton solve.

The frame log’s k = 570 line stays in the file and is dropped. The parsed log is k = 0 through 569. Every frame is c* = −0.7468707761049912 + 0.13335830940823915i. Width is 3.2 through 1.8 s, then the exponential zoom, then 3.5e−8 on the end hold.

Coming back to Live after the film has moved sets the live window to that frame’s centre and width, and moves the orange point to the same centre. A loop that was on is turned off, so the circle path does not pull c off the nucleus. At t = 18 the width box and the plane both read 3.5e−8, and `getC()` is the nucleus.

### Checked

Headless Chrome, light and dark, at 1280, 700, and 390. Live opens. The picker is hidden until Rendered, and Rendered opens on Leaving into dust. ArrowRight from that chip selects Deep zoom to a minibrot, focus follows, and the film stays paused. No minibrot mp4 is fetched until Play. Play at 1280 light decodes 1280×720. Play at 390 dark decodes 720×1280. Seeking to 18 s and returning to Live seeds the nucleus and the end width, the chips come back, and the video is paused. Leaving for Julia removes the video element. Scroll width was 0 with the picker open, including 390. No console error.

`node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node tools/rendered-check.mjs` exit 0. `node tools/check_vectors.mjs` is 65/65.

### For the mid reviewer

The c boxes still print about four decimals, because they follow the loop step. The window boxes hold the centre. The stored c is the full nucleus.

The hide-tab pause is the same `visibilitychange` listener the close review ran. This pass did not freeze the tab again. It did leave the station and saw the video element go.

The HyperFrames boundary film is still under the Manim player on Mandelbrot. The playground still settles a repelling cycle. Do not add the multiplier to the assembler.

### Residue

This pass does not merge.

## Rendered films and the multiplier — mid review

Branch `cursor/rendered-films-settle-f114`, pull request 12, base `gh-pages`. The close review stopped at `3593638`. Film C stopped at `640df7a`. This pass is `fb7b1f0` and `80136fa`. Zoom: does the film sit in the whole site, and does it match Test 1. One gesture, one sentence the picture checks, the four teaching colours, and the same fate word on every station. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. Verdict: **accept**.

### What changed

`fb7b1f0` puts the HyperFrames boundary film in the Film picker, as the third chip, “c crosses the cardioid”. Leaving into dust still opens. ArrowRight from that chip still selects Deep zoom to a minibrot. One more ArrowRight selects the page film. The video is hidden, and it stays paused. The slot under the picker is hidden on Live and on both Manim films, and it is the only picture while that chip is selected. The picture caption hides with it, because the panel lede is the caption. The switch is still “Rendered film”. The cardioid station still has one film and no picker.

The same commit makes the printed c follow the zoom. A window at least 1e-4 wide keeps the loop-step digits in the c boxes (four, at the default step) and eight in the centre boxes. A tighter window uses `ceil(-log10(width)) + 4`. Once that count reaches 12, both boxes spell the stored double with `String`, so the value round-trips. After Film C at t = 18 the width is 3.5e-8, and the c boxes and the centre boxes all read `-0.7468707761049912` and `0.13335830940823915`.

`80136fa` is the playground page. The walk is still the disk, with no `|f'|` passed in, so the points and the step are the walk the assembler reports. `applyDisplayedGuard` then rewrites reason `cluster` to `closed` when the product of `|f'|` over the last p steps is not strictly below 1. The disks stay. The badge fate is stay, the blue outline, and the sentence leads with Stays. A quadratic map uses `|2z|`. A higher power uses `|d z^{d-1}|`. Newton uses `|N'(z)|`, and a landing that is a root still sets the root flag. Headless, a verdict at the centre: c = i reads `Stays. Period 2.`, c = −2 reads `Stays. Period 1.`, c = −1 still reads `Settles. Period 2.`

### MX alignment

Hand this to the same `study/orbit-settle` note as the wide review of pull request 10. The assembler is unchanged.

- `settle()` in `js/playground/playground.js` still has no multiplier. A repelling cycle that closes inside its disk still returns Settles. That is the vector contract. `node tools/check_vectors.mjs` is 65/65, and the file hash above is the v2 bytes.
- The playground page does not import `settle`. It calls `orbitUntil` with no `absDeriv`, then `applyDisplayedGuard`. The displayed word is the station word. The stored walk is the assembler walk.
- c = i is Stays on the page and on the Mandelbrot station (period 2, product `4√2`). c = −2 is Stays on both (period 1, product 4). c = −1 and the basilica still Settle. Same step as the unguarded disk.
- The false Settles at c = 1/4 + 1e-4 and c = 1/4 + 1e-5 are unchanged. The product is just under 1 while the points sit in the disk. R was not shrunk.

### Consistency

Film credits. A Manim film says “Rendered with Manim.” Leaving and the cardioid link Howell & Mathews, Chapter 4, § 2. Deep zoom links Wikimedia Commons, File:Mandelbrot_sequence_new.gif, and keeps the Newton-solve note. The page film’s credit line is empty. Its panel cites Theorem 4.2.11 [PDF Theorem 4.9] and Example 4.2.16 [PDF Example 4.11]. The film page’s own cite line names the same two anchors. Figure 4.2.13 is still flagged as an unchecked PDF number.

Captions. Leaving’s picture line is the station sentence: one piece while the orbit of 0 stays bounded, and dust after that orbit leaves. The burned-in frame says “once” where the page says “after”. The fact is the same, and the mp4 was not re-rendered. The minibrot line is the poster: a deep zoom, centred on a period-70 nucleus, and the copy is the set again, smaller. The cardioid line bridges the film and the station: inside, the fixed point attracts, so the orbit of 0 settles; outside, that orbit leaves.

Colours. Blue stays, orange is c or leaves, green is the walk, purple is the third root. On the boundary film the c mark is `--polar` with a `--bg` stroke, so the orange point is visible on orange dust. The verdict is `--cart` when the orbit stayed and `--polar` when it left. Julia cells are unchanged. No green walk was added to that film. The four tokens were read off the page at home, Julia, Newton, and the playground, light and dark, and they match `css/theme.css`.

Prev, next, and Story Map. Mandelbrot’s previous is The Orbit of 0 (`#zero`) and its next is The Cardioid and the Period (`#bulbs`). The cardioid’s previous is The Mandelbrot Set and its next is Which c Keep 0 Bounded (`#seeds`). Story Map is `#home` on both, and the boundary panel has its own Story Map link. F1 still skips the cardioid. The playground is not a Next stop.

The boundary film still follows the station’s c. After the Film C seed, that chip says Connected, because the nucleus is inside the set. The fixed path, through the cusp and out to dust, is what the page draws when the station is not pushing a c. The film’s own c line is still three decimals. The station boxes, which hold the full address, are hidden while Rendered is selected, including this chip. The address is on Live.

### Checked

`node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node tools/rendered-check.mjs` exit 0. `node tools/check_vectors.mjs` is 65/65.

Headless Chrome, light and dark, at 1280, 700, and 390. Live opens. The picker is hidden until Rendered, and Rendered opens on Leaving into dust. Nothing autoplays. No mp4 before Play. Scroll width was 0 with three chips, including 390. ArrowRight from Deep zoom opens the page film, the video stays paused, and no new mp4 is fetched. The panel names the crossing and both citations. Play on Deep zoom at 1280 light decodes 1280×720. Play at 390 dark decodes 720×1280. Seeking to 18 s and returning to Live seeds the nucleus, and the boxes spell it. Leaving for Julia drops the video. No console error and no failed asset on those passes.

The same Chrome opened home, Julia, and Newton at those three widths in both themes. Story Map is home. Prev and next are stations. The four colours match. No sideways scroll, no console error, no failed asset. The playground opens the same way. The three verdicts above were clicked in light, at the centre, after the roll had gone idle.

### For the wide reviewer

The hide-tab pause was not frozen again. The close review already ran `visibilitychange`. This pass left the station and saw the video element go.

`criticalPeriod` can still name a cycle while the disk says Stays on a slow approach. The on-screen R follows the companion width, about 0.07 at 1280 against the research table’s 0.02. The words match. The number in the sentence will not.

The assembler itself still Settles a repelling cycle. Only the page’s badge was changed. A vector that calls `settle()` will not say Stays.

The boundary film’s on-picture c is three decimals, and the full address is hidden while that chip is up. The burned-in Leaving caption says “once” and the page says “after”. WebXR was not opened. `films/shared/hostclock.js` was not edited. A playground power other than 2, and a Newton verdict in the void, were not clicked. The guard for those maps is the same function the stations use.

### Residue

Pull request 12 was not merged. No new pull request was opened.

## Rendered films — wide review

Branch `cursor/rendered-films-settle-f114`, pull request 12, base `gh-pages`. Close stopped at `3593638` and Film C at `640df7a`. Mid stopped at `fb7b1f0`, `80136fa`, and `c4bf8d9`. `origin/gh-pages` is `113761d`, which is an ancestor, so the pull request merges clean. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. Zoom: watch a film, step into Live at that frame, and keep going. Verdict: **READY**.

### The handoff

Leaving into dust at 12 s spells `c = 0.2585477520127165` on the quiet line under the chips. Live opens on `c = 0.2585` and says `Leaves. The walk escaped on step 32.`, then dust and Period 0. At 5 s the film spells `c = 0.176128`. Live says `c = 0.1761` and `Settles. Period 1.`, one piece, a fixed point that attracts. The four loop-step digits are the wide window. The film’s full address and the live sentence are the same point: inside the cardioid the orbit of 0 settles, and past the cusp it leaves.

Deep zoom at the end hold spells `c = -0.7468707761049912 + 0.13335830940823915i, width 3.5000e-8`. Live’s c boxes and centre boxes are that nucleus, and the plane’s width is `3.5e-8`. The picture on that window is a small copy of the whole set, the shape the film has been naming. The station caption is already “the copy is the set again, smaller.” The handoff is the same mathematics. The Julia companion is reset to width 4, and its disk (about 0.07, period at most 32, 800 steps) says `Stays. Period 26` and stops. That line cannot name a period-70 cycle. The Mandelbrot plane and the address are the lesson. The period cap was not raised.

### The settle word

The hedge (“looks settled at this zoom; zoom in to check”) does not land. It cannot be aimed. At the moment the disk closes, the basilica’s product is already in the same neighbourhood as the false cusp (about 0.986 at R = 0.02, about 0.971 at R = 0.07). A caveat on every product near 1 would doubt the period-2 landing the cardioid station teaches. The film the learner just watched says that outside the cusp the orbit leaves. Live has to say Leaves.

The walk tightens. A window product in `[0.93, 1)` is a crawl, not a landing. The first such disk is kept, and the walk continues until the orbit escapes or 12000 further steps pass. A later window whose product reaches 1 is the approach passing `|z| = 1/2`. It is not a Stays verdict. Escape is the only overturn. If the extra steps run out, the sentence is Settles at the first close, so the basilica still reports that step.

`0.95` was too high for the page. The station disk is about 0.07, and `c = 1/4 + 1e-5` first closes there with a product near 0.9495. The threshold sits under that product and under the basilica’s. `c = 1/4 + 1e-4` leaves on step 312. `c = 1/4 + 1e-5` leaves on step 991, at R = 0.02 and at R = 0.07 and at R = 0.15. `c = 1/4 + 1e-6` leaves on step 3140. `c = 1/4 + 1e-7` leaves on step 9933. The basilica stays Settles, period 2: step 208 at R = 0.02, step 94 at R = 0.07. `c = 0.25` itself stays Settles, period 1. `c = 0`, `c = −1`, `c = 0.2`, and the rabbit still Settle. `c = i` stays period 2. `c = −2` stays period 1. The same sentences are on the Mandelbrot station, the cardioid station, and the playground badge.

Four decimals would print `1/4 + 1e-5` as `0.25`, and `0.25` settles, so a correct Leaves would sit under the cusp. When the short spelling is exactly `0.25` or `-0.75` and the stored value is not that number, the box spells the stored digits. On the cardioid station the line is `c = 0.25001` and `Leaves. The walk escaped on step 991.` A wide-window value such as `0.2585` still rounds.

The playground page passes `|f'|` into this same walk, then the guard still rewrites a repelling cluster to Stays. Headless, after the roll went idle, Enter at the centre: `c = i` is `Stays. Period 2.`, `c = −2` is `Stays. Period 1.`, `c = −0.75` is `Settles. Period 2.`, `c = 0.2501` and `c = 0.25001` Leave on steps 312 and 991, `c = −1` and `c = 0` Settle. The assembler file is not asked. A call to `settle()` still Settles a repelling cycle. Vectors stay 65/65.

`criticalPeriod` still stops at 240 steps. A critical start whose disk walk has escaped is dust and Period 0, including when that short probe has not left yet. The piece line stays about the orbit of 0. It is not rewritten for a start that is not 0.

### The quiet address, and the hidden tab

While Rendered is up, a muted mono line above the figure spells the frame’s c with `String`, so the nucleus round-trips. A logged width uses the plane’s width-box rule: under `1e-4` it is `toExponential(4)`, so the end hold reads `3.5000e-8` and not the raw double. Live hides the line. The type is at least 15 px. The page film hides the video and still shows the station c, without a width. Headless, once, on its own page target at 1280: `Page.setWebLifecycleState` `frozen` sets `document.hidden`, the Leaving film pauses, and `currentTime` holds. `rendered-check` records “hidden tab: freezing pauses the film and holds the frame”.

### Checked

`node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs` exit 0. `node tools/check_vectors.mjs` is 65/65.

`rendered-check` is 1280, 700, and 390, light and dark, both stations: Live opens, the address waits until Rendered, the opening line is `c = 0` or `c = 0.25`, Deep zoom spells the nucleus and `width 3.2`, the page film spells the nucleus without a width, portrait under 600, no mp4 before Play, no sideways scroll, no console error. The freeze is the last check.

### MX alignment

Hand this to the same `study/orbit-settle` note.

- `settle()` in the assembler still has no multiplier. The vector contract is unchanged.
- The stations and the playground page call `orbitUntil` with `|f'|`. A product in `[0.93, 1)` continues. The displayed word is one word on the stations, the films, and the badge.
- The assembler walk, with no `|f'|`, still closes `c = 1/4 + 1e-4` as a cluster at step 68. That row stays in `RESEARCH_LOG.md`.

### Residue

`c = 1/4 + 1e-8` leaves near step 31000. The extra budget is 12000 steps, so that decade can still read Settles. A disk wider than the ones measured here (through R = 0.15) could close `1e-5` with a product under 0.93. At R = 0.15 it still Leaves.

The period-70 nucleus, read on the Julia companion at width 4, says Stays and a period of 26 after 800 steps. The disk’s period stops at 32. The Mandelbrot picture is the small copy, and the address is the nucleus.

Wide-window c boxes stay on the loop step, except the two parabolic spellings above. The burned-in Leaving caption says “once” where the page says “after”. Figure 4.2.13 still has no PDF number. WebXR was not opened. `films/shared/hostclock.js` was not edited.

Pull request 12 has no inline review threads. Copilot review 5625446669 is a quota failure. Codex comments 6360232672 and 6360233179 failed before a review and left no line findings. Nothing to resolve on a line. This pass does not merge.

## PR #13 close

Branch `cursor/playground-sphere-split-6b79`, pull request 13, base `gh-pages`. Zoom: the new controls and the layout. Split panes, the sphere drag, touch on both panes, the level kicker, at 1280, 700, and 390, light and dark, keyboard and touch. One clock. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still the same bytes. Verdict: **accept with fixes**.

### Fixed

The camera sat on the north pole, so the ball read as a disk and infinity sat in the middle. The camera now looks from the front, a little above the equator, with north at the top of the silhouette. The distance follows the tighter field of view, so a 195px pane still holds the whole sphere and the pole. The pole is the live `--polar` token and a little larger. The walk on the sphere is the live `--input` token, and the last step to infinity uses `--polar`. Light and dark no longer share the dark-theme hex.

The stage for the sphere, and for the plane beside it, stops at the solid part of the footer. `height: 100%` had been ignoring that inset, so the ball ran under the type. A short window still keeps at least 42vh, or 160px, for the picture. The parameter split stays full-bleed. It is one field, and a tap above the type still hits either pane.

Arrow keys follow the gesture again. On a sphere with nudge, they had been stolen to orbit, while the buttons still advertised those arrows as moving c. Unshifted arrows nudge, drag c, scrub, or zoom, whichever the picture is. Shift and an arrow turns the sphere, and it does not also step the gesture. The hint says which is which. A drag on the plane updates the formula in the same move. It had been rewriting c and leaving the old address on screen until the next resize.

A tap sentence is shown only when the picture takes a tap. On a roll, the line no longer says a tap on either side is the same point. When the picture does take a tap, the green walk is drawn on the flat pane as well as on the sphere, clipped to that pane. The fate is still the walk, not the window: leaving the window does not send the sphere to the pole. Only an escape does. The level line is a polite live region.

### Checked

Headless Chrome, light and dark, at 1280×800, 700×900, and 390×844. No sideways scroll. No console error on those passes. The stage for a sphere or a split sphere ends before the solid footer (`stageIntoSolid` was 0).

The level kicker. A fresh page says watch. Begin on an empty diary says `touch · next`, and the caption is “Square, then slide by c.” A turn-level picture says turn. The line fits on one row at 390.

The sphere. Drag after the scrub is paused leaves c alone and draws the turn. Shift+ArrowRight and Shift+ArrowUp leave c alone. An unshifted arrow on that scrub steps the path, and the formula changes. On a forced nudge, an unshifted arrow moves c and Shift+Arrow does not. A tap pauses the path clock: draws stayed at 163 across 700ms while the phase still read play. While the scrub was running, draws advanced (153 to 160 in 500ms). That is the one clock. Freezing the tab held draws at 169, and `document.hidden` was set.

The parameter split. At 390, light and dark, a touch on the left keeps c and reads Leaves. A touch on the right writes a new c (from −0.123+0.745i to −0.6+0.918i) and reads Leaves. The hint still names the right side as a c.

The plane beside the sphere. A forced trace with drag-c: a touch on the plane reads Settles, period 2, and a touch on the sphere reads Leaves. c does not change. The green walk is on the plane and on the sphere. A drag that starts on the sphere leaves c alone. A drag that starts on the plane moves c, and the formula follows (from −0.75 to −0.201−0.05i in the pointer probe). At 390 both panes still answer a touch. Resizing 1280 to 700 to 390 keeps the same c on the formula. The layout stays split.

The shared clock is `motion.drive`. Nothing else schedules a frame. Hidden, and a paused scrub, add no draws. Idle on the parameter split held draws still.

`node tools/check_vectors.mjs` is 72/72. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0.

### Citations

The sphere line still says Problem 2.5.1, links `1/z and the Sphere`, and names thread T1. The stored section in `js/data/problems.js` is the title “The Reciprocal Transformation and Extended Complex Plane.” The textbook HTML section number for that problem was not opened. It is not printed as a section number here.

Figure 4.2.13 still has no PDF page. Mandelbrot and the cardioid already say the number was not checked. Nothing in this pass invented one.

Julia, the higher power, Mandelbrot, and Newton keep the pins already on those stations: §4.2, Example 4.2.16 [PDF Example 4.11], Example 4.2.1 [PDF Example 4.7].

### Residue

`c = 1/4 + 1e-9` still reads Settles. Its escape is past the 40000-step lookahead. `c = 1/4` itself still Settles. That is the parabolic point. A 4096-step critical probe still says period 1 for `c = 1/4 + 1e-8`, because the escape is step 31414. The page does not use that probe for the fate.

The parameter split is still full-bleed, so the footer covers the lower part of both panes. The taps above the type work. A headset was not in the room. The WebXR path is the reject stub the smoke already runs. `films/shared/hostclock.js` was not edited. The assembler was not edited.

Pull request 13 was not merged.

## PR #13 mid

Branch `cursor/playground-sphere-split-6b79`, pull request 13, base `gh-pages`. Zoom: the sphere and the two splits against the rest of the site. Story Map, threads T1/T2/T3, the registry, the teaching colours, and the point at infinity. Verdict: **accept with fixes**.

### Fixed

The footer now always lists five places: Story Map, 1/z and the Sphere, Julia Sets, The Mandelbrot Set, and The Cardioid and the Period. Story Map and the thread badges write `mv:map` as Test 1. Julia, the set, and the cardioid write Test 2, which those routes already force. The header word is Story Map, and it uses the same Test 1 write. The listener that wrote Test 2 on that same link is gone.

A sphere or either split earns the thread badges. T1 is the extended plane. T3 is a function as a motion. T2 is the square, so it lights for Julia, a higher power, and the set of c. Newton stays on T1 and T3. The badge links open `#home-t1`, `#home-t2`, and `#home-t3`.

The extra chips follow the same rule. A split of a power map adds the slide (T1) and A Function Is a Motion (T3). Every sphere or split of a power map adds Powers (T2). Newton on a sphere or a split adds The Derivative Is a Move. A verdict adds Sequences. A trace adds Repeat. The prefix is `T1 ·`, the badge voice. The playground sits outside the thread order, so the prefix stays the badge and carries no direction word.

The registry entry stays `map: 'test2'`, `threads: []`, `problems: []`, `topics: []`, order 17, part H. `MAPS` is unchanged. `OFF_NEXT` still holds `playground`, so it stays off Next. The summary now names the five places.

The kicker is 0.88rem muted mono, the same size as a Test 1 source line. The citation is a `.source-tag`. The badges and the chips copy the Test 1 pills: T1 a filled blue disk, T2 a dashed orange ring, T3 a purple diamond. The playground keeps its own copies of those rules. `components.css` sets `body { display: grid }`, which would break the fixed stage. The formula is still KaTeX.

Infinity agrees with Chapter 2, § 5. The point at infinity is the north pole, and 1/z sends 0 there. A dynamical sphere says that, and a walk that leaves ends there. A Mandelbrot sphere is the c-plane: large |c| sits at the pole. The orbit of 0 is a walk in z, so `showOrbit` receives nothing on that sphere. The pole stays `--polar`. The walk stays `--input`.

### Citations

Opened the open-edition PDF (the printed footer, separate from the file index) and the HTML edition.

Chapter 2, § 5 is “The Reciprocal Transformation w = 1/z”. HTML Figure 2.5.2, id `fig_ch-02-22`, is the Riemann sphere. The PDF calls that picture Figure 2.22. The footer on that page is 73 (file index 82). The north pole N is the point at infinity.

Handout problem 2.5.1, stored in `js/data/problems.js`, asks for the image of the circle |z − 1| = 1 under w = 1/z. Its `section` field is the title “The Reciprocal Transformation and Extended Complex Plane”. That field is the title printed on the problem card, and it stays a title. The book’s Exercise 2.5.1, under “Exercises for Section 2.5”, is a different list. It opens on the line Im z = 1/5 and continues with other circles and lines. The cite says the book’s exercise is a different question. The two numbers stay apart.

HTML Figure 4.2.13, id `fig_ch-04-cp-6`, is the Mandelbrot set. The PDF calls it Figure 4.6. The footer on that page is 114 (file index 123). The Mandelbrot lede, the cardioid lede, exercise 4.2.10, and the playground pin now say PDF Figure 4.6, page 114. Exercise 10 is the cardioid in that figure. Example 4.2.16 [PDF Example 4.11] is the disk |c| ≤ 1/4.

Julia of a general c has no exercise of its own. Exercise 4 is the disk at c = 0. Exercises 7–13 are the set of c. The section draws the power 2. No exercise numbers a higher power. Newton stays Example 4.2.1 [PDF Example 4.7]. Exercise 3 is a line. The coloured basins have no numbered exercise. Exercises 1 and 2 are the half-planes. Those gaps are printed on the page. Nothing was invented to fill them.

### Decisions

T2 is the staircase, the square. Newton stays off that badge. The reciprocal station is already in the always-on row, so a sphere does not add a second 1/z chip. The split is where the slide and the motion earn their own chips. Story Map remembers Test 1 because T1–T3 live on that map. The playground’s own registry row stays on Test 2 with an empty thread list, so neighbour walks still skip it.

The assembler was left byte-identical. Both copies remain sha256 `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. One clock remains `motion.drive`. An idle split sphere added no draws across 600ms. `films/shared/hostclock.js` was left as it was.

### Checked

Headless Chrome. Split sphere at 1280×800 light and 390×844 dark. Parameter split at 700×900 light. Lone sphere at 1280×800 dark. A fresh plane at 1280×800 light. No sideways scroll on those passes. The formula is KaTeX. The kicker and the cite compute at 14.08px, which is 0.88rem. On the split sphere the stage ends about 25px above the solid footer at 1280, 700, and 390 (`into` was −25, −27, −25). The footer is capped and scrolls.

Story Map and a T1 badge store `"test1"`. The Mandelbrot chip stores `"test2"`. A plane hides the badges and still lists the five places. A parameter split names F2 and leaves the pole sentence for the sphere. A lone dynamical sphere says the pole is the point 1/z sends 0 to.

`node tools/check_vectors.mjs` is 72/72. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0.

### Residue

`c = 1/4 + 1e-9` still reads Settles. The parameter split is still full-bleed. WebXR is still the reject stub. The handout’s `section` string stays the title, on purpose. A higher power, a coloured Newton basin, and a Julia set at a general c still have no exercise number, and the cite says so. `MANDELBROT_FIGURE_SOURCE` is exported beside the other anchors. Nothing imports it yet. Pull request 13 was not merged.

## PR #13 wide

Branch `cursor/playground-sphere-split-6b79`, pull request 13, base `gh-pages`. Zoom: what the playground makes the learner observe. The sphere against Test 1 and Test 2, the level order, and whether the void still feels made rather than generated. Verdict: **accept with fixes**. This pass does not merge.

### What the learner is asked to see

The void is a place where one rule becomes a picture, and the picture is asked a question. Watch is the shape writing itself. Touch is a hand on c, and one orbit. Walk is the decision: settles, stays, or leaves, and the same c as a point on the set. Dive is a closer look. Turn lifts that decision onto the sphere. Shape raises the escape as height. The picker adds one new part at a time, so the learner meets the pole only after Leaves already means something. That order teaches. It is not a quiz. It is six ways of looking, unlocked by having looked.

The sphere is the sentence that joins the two tests. On a dynamical sphere the cite says the north pole is the point at infinity, the same point 1/z sends 0 to, and a walk that leaves ends there. That is Chapter 2, § 5, Figure 2.5.2, and it is also the escape of Chapter 4. A Mandelbrot sphere does not draw the orbit of 0 on the c-sphere. Large |c| sits at the pole. The two pictures stay different, and the point they share is named in the same words. The idea lands.

The magic is still there. The stars are one seeded field, drawn once. A steady tilt does not keep painting. The roll is 2400ms and then a 600ms settle. The next shape is `pick()`, and the vectors are 72/72. Nothing in the void is a random frame.

### Fixed

`c = 1/4 + 1e-9` was Settles. Extending the lookahead would only move the lie. The escape time past the cusp grows like π/√ε, so 1e-9 leaves near step 99000 and 1e-10 near 314000. A longer watch teaches the computer, not the cusp. The book already has the sentence. Exercise 8: a real c bigger than 1/4 is not in the set, because each step grows by at least c − 1/4. The seeds chip for c = 1/2 says that. The exhausted real climb of the orbit of 0 now says the same opening, and adds that the probe stopped while the walk was still climbing, so the closed disk is not Settles. The reason is `cusp`. The badge, the strip, and the sphere treat it as a leave, so the walk ends at the north pole. `c = 1/4` is the parabolic point. It is not greater than 1/4, the look runs out, and it still Settles, period 1. `c = 1/4 + 1e-8` still leaves on the counted step 31414, because that escape fits in the 40000-step look. The 4096-step critical probe no longer calls a real c past 1/4 period 1. It says period 0. `c = 1/4` on that probe is still period 1.

The parameter split is no longer full-bleed. The close review kept it full-bleed because it is one field. It is still one bitmap, and a tap still hits either pane. The solid footer was covering the lower part of both panes, so the comparison walk exists to teach was partly hidden. The stage now stops at the solid footer, the same clear band as the sphere. A lone plane stays full-bleed. That plane is the void. The comparison is an object in the void, and the stars show in the margin.

`MANDELBROT_FIGURE_SOURCE` is imported. The Mandelbrot pin links Example 4.2.16 to its anchor, and Figure 4.2.13 [PDF Figure 4.6, page 114] to `sec_julia-mandelbrot.html#fig_ch-04-cp-6`. A cardioid or period-2 loop uses that same anchor for Exercise 10. The words were already on the page. The unused export was the hole.

### MX alignment

The assembler was not edited. `js/playground/playground.js` and `tools/playground.js` are still the same bytes, sha256 `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`.

Hand this to the `study/orbit-settle` cell. The cell has no Exercise 8 branch and no `CUSP_EXTRA`. `settle()` can still say Settles for `c = 1/4 + 1e-9`. That is the vector contract. The page does not import `settle`. It calls `orbitUntil`. The learner-facing word is the station word: Leaves, Exercise 8, the same sentence on the screen disk and the station disk. `c = 1/4` still Settles on both. The basilica still Settles at the first disk.

### Citations

Nothing new was numbered. Julia, a higher power, Mandelbrot, Newton, and the sphere keep the pins from the mid review. The gaps stay printed: a general c has no exercise of its own, no exercise numbers a higher power, and the coloured basins are not a numbered exercise. Height, curvature, an orbit trap, and escape bands do not state a theorem. They wear the map’s pin. No figure was invented for them. The handout’s `section` string for problem 2.5.1 stays the title, on purpose. The book’s Exercise 2.5.1 stays a different question.

### Checked

`origin/gh-pages` was fetched. It is `3044213`, already an ancestor of this branch. The branch was not behind. No merge commit.

Headless Chrome. Plane, parameter split, and split sphere, light and dark, at 1280×800, 700×900, and 390×844. No sideways scroll. No console error on those passes. The parameter split and the split sphere end on the clear side of the solid footer (`into` ≤ 1). A lone sphere at 1280 has no console error. A lone plane stays `data-layout="full"`.

One clock, `motion.drive`. A playing scrub increased `data-draws` across 500ms. A paused scrub, phase still `play`, held the count across the next 500ms. With `document.hidden` forced, the count held across 500ms. Idle on the parameter split was not a second clock.

`node tools/check_vectors.mjs` is 72/72. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0.

### Residue

WebXR is still the reject stub. A headset was not in the room. `films/shared/hostclock.js` was not edited. Exercise 8 is the orbit of 0. A start that is not 0, at a real c past 1/4, is not that exercise. If that other walk’s climb exhausts the lookahead, the disk can still read Settles. The assembler cell can still read Settles for the orbit of 0. The page does not show that word. Pull request 13 was not merged.

## PR #14 close

Branch `cursor/playground-batch3-9709`, pull request 14, base `gh-pages`. Zoom: the flash, the reduced-motion path, touch and the keyboard, the XR button and its fallback line, and the chordal split at 1280, 700, and 390, light and dark. One clock. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still the same bytes, sha256 `0d0dcc001de873ec7a160340422381d4c0238fd7a0c297c50294e46f550e27f8`. Verdict: **accept with fixes**.

### Fixed

A flash could not be cut, and a second one could paint over the first. A tap, Space, or Enter now replaces the ink. Escape sends it away and brings the first picture back, or the void if that was the page. The token is what makes the old bake give up. A committed roll or settle still finishes. That picture was already being written.

The diary timing stays slow. The ink rolls for 2400ms, the blur settles for 600ms, the shape holds for 480ms, and it leaves on a 1200ms smoothstep. Reduced motion shows the finished shape, holds for 800ms, and fades in 420ms. That path does not enter roll or settle. A reduced scrub does not autoplay. The hold and the fade are `motion.run`. The ink has no second timer.

The chordal sheet was a ribbon, and the dark pane around it was a black card. The inline canvas is transparent, so the sheet sits in the same void as the plane. An opaque sky, and the three.js stars, are for a presented `immersive-vr` session. The camera looks down from a desk angle and fits the corners of the sheet into the pane. The graph’s width-to-depth is the pane’s width-to-height, including when a phone stacks the plane above the distance. A tap in the margin still names the point on the window.

Under 480px the chordal split is one column. 390 stacks. 700 and 1280 stay side by side. The overlay spans both cells, so it does not open a third row. The headset sentence stays sticky above Next, in the text colour, and the button describes it. The sentence is still `No headset session. The shape stays in the void.`

Space on the empty void flashes the centre. Enter still begins. On a landed picture that is not an orbit or a verdict, Enter or Space flashes that centre. Shift and an arrow turns the chordal surface as well as the sphere. A double tap flips the sphere only.

### Checked

Headless Chrome. Split chordal, light and dark, at 1280×800, 700×900, and 390×844. No sideways scroll. The stage ends about 47px above the solid footer (`into` was −47). No console error on those passes. At 1280 and 700 the panes sit side by side (640×515 and 350×577). At 390 the plane is on top and the distance is under it (390×260). The sheet fills the pane, with the page sky in the margin. In the dark theme that margin is the night sky, `#0d121c`. A lone sphere at 1280, light and dark, still holds the ball with north at the top.

A flash from the empty void took 6461ms. The caption was the void again, the stage opacity was 1, and draws held at 79 across the next 600ms. A second Space during the ink, then Escape, cleared it in 446ms. Draws held at 90 across the next 500ms. Reduced motion took 1797ms. The phase never read roll or settle, and draws held at 1. Forcing `document.hidden` after that held the count. A playing scrub still draws. A paused scrub, and a hidden tab, draw nothing. That is the one clock, `motion.run` and `motion.drive`.

The XR button stays in the header. A refused session shows the fallback sentence with `data-state="miss"`. A stub session still opens, and select flashes the shape. Leave stays available while the ink is moving. Enter waits.

`node tools/check_vectors.mjs` is 82/82. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0. The playground smoke was run again after the keyboard change.

### Citations

The chordal distance has no numbered exercise in Howell & Mathews. The cite already says so, and this pass left that sentence. It is §2.5, Figure 2.5.2 [PDF Figure 2.22, page 73], then “No exercise numbers this distance.” HTML Figure 2.5.2 is `fig_ch-02-22`. The open-edition PDF calls that picture Figure 2.22. The printed page is 73. Nothing here invented an exercise number. Problem 2.5.1 stays on the sphere cite, the circle |z − 1| = 1. The book’s Exercise 2.5.1 stays a different question.

### Residue

A headset was not in the room. The WebXR path is the smoke’s session stub and the reject. `films/shared/hostclock.js` was not edited. The wheel and the pinch still use a 400ms flag so one gesture counts once. That flag does not paint. `settle()` on this branch already reads Leaves for `c = 1/4 + 1e-9`, reason `cusp`, and the vectors lock that. This pass did not open the assembler. Pull request 14 was not merged.

## PR #14 mid

Branch `cursor/playground-batch3-9709`, pull request 14, base `gh-pages`. Zoom: the flash, the chordal split, and the level line against the rest of the site. Story Map, threads T1/T2/T3, the registry, the teaching type, and the book’s letters for the distance. Verdict: **accept with fixes**. This pass does not merge.

### Fixed

A flash said “The void writes back.” It now names the map and the c in KaTeX, and the name is the link. Julia and a higher power open Julia Sets. Newton opens Newton Fractals. The Mandelbrot set opens that station, and the sentence names the cardioid, which opens The Cardioid and the Period. The footer grows a Newton chip only while the picture is Newton. Story Map, 1/z and the Sphere, Julia, the set, and the cardioid stay on every picture.

The chordal formula is KaTeX. The first line is Exercise 14’s lift, \(z=x+iy\) at \(\bigl(x/(x^2+y^2+1),\; y/(x^2+y^2+1),\; (x^2+y^2)/(x^2+y^2+1)\bigr)\). The second line is the distance between two such points on the book’s sphere of diameter 1, \(|z-c| / \bigl(\sqrt{1+|z|^2}\sqrt{1+|c|^2}\bigr)\). The page does not call that distance \(\chi\). The book never writes the letter. The same quotient sits in the caption, in text size, so the headline is the formula and not a second essay.

The level line is `L6 · metric` when the picture is the metric, and `L6 · metric · next` when the learner is ahead of the picture on screen. The footer nav carries the same `L6 · metric` in its label. A flash counts toward the unlock before the level is read, so the fourth flash can open metric instead of waiting for the next tap. The body type is the Test 1 size, 1.0625rem. The pills use the same tap height, radius, and gap tokens. T1 is still a filled blue disk, T2 a dashed orange ring, T3 a purple diamond.

A chordal picture, and either split, still earns the badges. T1 is the extended plane. T3 is a function as a motion. T2 is the square, so it lights only for a power map: Julia, a higher power, and the set of c. Newton stays on T1 and T3. The badge links still open `#home-t1`, `#home-t2`, and `#home-t3`, and they still write Test 1.

The registry row stays `map: 'test2'`, `threads: []`, `problems: []`, `topics: []`, order 17, part H. `MAPS` is unchanged. `OFF_NEXT` still holds `playground`. The summary now names the flash, L6, the Story Map, and 1/z and the Sphere.

### Citations

Opened the HTML edition of Chapter 2, § 5, “The Reciprocal Transformation \(w=1/z\)”. Figure 2.5.2 is the Riemann sphere. Exercise 14, still in that section, is the coordinate triple above. It is not an exercise about the distance. The cite says so, in those words: the coordinates are Exercise 14, and no exercise numbers this distance. Nothing here invented an exercise number for the distance. Problem 2.5.1 stays on the sphere cite. The book’s Exercise 2.5.1 stays a different question. Julia, the higher power, Mandelbrot, and Newton keep the pins already on those stations.

### Decisions

The higher power has no station of its own. It is still a Julia set, so the flash opens Julia and the formula shows the power. The cardioid is the main body of the set, so a Mandelbrot flash names both rooms instead of pretending the whole set is the cardioid. T2 stays on the set of c because the iteration is still the square. Newton is not that square. The reciprocal station is already in the always-on row, so a chordal view does not add a second 1/z chip. Story Map remembers Test 1. The playground’s own registry row stays on Test 2 with an empty thread list.

The assembler was left byte-identical. Both copies remain sha256 `0d0dcc001de873ec7a160340422381d4c0238fd7a0c297c50294e46f550e27f8`. One clock remains `motion.run` and `motion.drive`.

### Checked

`node tools/check_vectors.mjs` is 82/82. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0.

Headless Chrome. A select with no headset flashes a Julia set: the caption names Julia and the c, the link is `#julia`, and the formula is KaTeX. It still fades to the stars. The chordal split cites Figure 2.5.2, Exercise 14, and the missing distance exercise, shows two KaTeX blocks, and labels the level and the footer `L6 · metric`. The badges are T1, T2, and T3. The places name Story Map and 1/z and the Sphere. At 1280, 700, and 390 the chordal split does not scroll sideways. A playing scrub draws. A paused scrub, and a hidden tab, draw nothing.

### Residue

A headset was not in the room. The WebXR path is the smoke’s session stub and the reject. `films/shared/hostclock.js` was not edited. A higher power, a coloured Newton basin, and a Julia set at a general c still have no exercise number, and the cite says so. The chordal distance still has none. Exercise 14 is the coordinates only. Pull request 14 was not merged.

## PR #14 wide

Branch `cursor/playground-batch3-9709`, pull request 14, base `gh-pages`. Zoom: what the learner observes from the first touch to L6. The flash as a door, the chordal metric as one idea with the sphere and 1/z, the order of the levels, and whether the void is still a made thing. Verdict: **accept with fixes**. This pass does not merge.

### What the learner is asked to see

The first touch is a question. The void writes a shape and names it, and the name is a door. When the ink leaves, the door stays. “The void answered. Julia teaches this shape.” The link is the station. If a picture was already underneath, that picture comes back, and its cite is the door. The stars are what the page returns to.

L0 through L5 are the same six ways of looking. Watch, touch, walk, dive, turn, shape. Metric is the seventh, and it waits until the shape chapter has been seen. Escape is a height before infinity is a height. One flash means the void has answered. Four flashes was a count. It made the learner collect taps, and it made the shape caption name the distance before the picture existed.

The metric is one sentence. The plane’s orange corners and the sheet’s orange rim are the same ink, the polar token. The sheet does not shade that colour, so a light cannot rename the point. They are one point, and the height there is finite. It is the north pole the learner already met when a walk left, the same point 1/z sends 0 to. The formula is Exercise 14’s lift, then the distance between two such points on the book’s sphere of diameter 1. The page does not print a letter. Pinch moves the finite part. The corners stay. A tap on that picture names the distance. It does not cover the sheet with a flash.

### Fixed

The flash used to end by forgetting its name. An empty void went back to “Touch the void. A shape will answer.” The name now stays, with the station link and the KaTeX, after the stars return. A saved picture is restored instead of that residue.

The chordal sheet was a crop of the window. At span 3.2 the edge is still climbing, so infinity was a direction. The sheet is the extended plane. Inside the inscribed circle, z runs out as span · ρ / (1 − ρ). On the circle, and in the corners outside it, every sample is infinity, at height 1/√(1+|c|²). The plane beside the sheet uses that same chart, so a tap is the same point. The corners lead the diary, because their key is 0.

Those corners were then shaded. Lambert took the polar token down, so the sheet’s infinity was a darker orange than the plane’s. The pole is a colour, not a lit surface. Pole fragments are unlit. In the light theme that is `#a84300`. In the dark theme it is `#ff9d5c`. The plane’s four corners are those exact bytes. About 15,000 pixels of the sheet are that same colour, on the far rim and in all four corners. The bowl stays shaded, so the distance still reads. For c = −0.75 the valley sits left of centre, and it is lower than the rim.

L6 unlocked at four flashes and 16 pictures. The unlock is now one flash and 16 pictures. The L5 line asks for the touch, or for a few more pictures. It does not say the word that L6 is for. The unlock line names the distance only when metric opens: “Next can show the distance to infinity.”

### MX alignment

`settle()` was not edited. The cusp Leaves at `c = 1/4 + 1e-9`, reason `cusp`, stays the close-review contract.

`UNLOCK` for L6 changed from `{flashes: 4, history: 16}` to `{flashes: 1, history: 16}`. Both assembler copies. sha256 `147801c521d9210cbc81f39b9c9c59eef651f66b5bda301c9664a633e2e5c708`.

One flash, because the flash is the void answering and the residue is the door. A quota of four taught counting. History stays 16 so the shape chapter is on screen first. Shape opens at history 12, with the second session. Opening the metric at that same history would let the picker offer the chordal view in the same chapter as the escape height. The page reads `level()` from the assembler.

Vectors are 87/87. Three level rows lock the boundary: no flash and 16 pictures stays L5, one flash and 15 pictures stays L5, one flash and 16 pictures is L6. Two check rows: `view=chordal` is locked at that L5, and it is open at L6. The older `flashes: 4` rows still pass.

### Citations

Nothing numbered was invented. The chordal cite is still §2.5, Figure 2.5.2 [PDF Figure 2.22, page 73], Exercise 14 for the coordinates, and the sentence that no exercise numbers the distance. Problem 2.5.1 stays the circle on the sphere cite. The book’s Exercise 2.5.1 stays a different question. A higher power, a coloured Newton basin, and a Julia set at a general c stay unnumbered, and the cite still says so.

### Checked

`origin/gh-pages` is `04bfdc7`. It is an ancestor of this branch. The branch was not behind. No merge commit.

`node tools/check_vectors.mjs` is 87/87. `node kit/smoke.mjs`, `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, `node tools/rendered-check.mjs`, and `node tools/playground-smoke.mjs` exit 0. The playground smoke was run again after the pole stopped taking light.

Headless Chrome. Chordal split, light and dark, at 1280×800, 700×900, and 390×844. No sideways scroll. No console error. Plane, parameter split, and split sphere, the same sizes and both themes, no console error. A flash from a headset-free session fades to idle, the caption still names Julia and links `#julia`, and `data-draws` holds across the next 600ms. A playing scrub draws. A paused scrub, and a hidden tab, draw nothing. That is the one clock, `motion.run` and `motion.drive`.

### Residue

A headset was not in the room. The WebXR path is the smoke’s session stub and the reject line, “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited. A higher power, a coloured Newton basin, and a Julia set at a general c still have no exercise number. The chordal distance still has none. Exercise 14 is the coordinates only. `c = 1/4 + 1e-9` Leaves in `settle()`. A start that is not 0, past the cusp, can still read Settles on the page if the lookahead runs out. Pull request 14 was not merged.

## PR #15 close review

Branch `cursor/playground-l7-l8-7e75`, pull request 15, base `gh-pages`. Zoom: the new controls and the layout. The angle slider, Shift and the arrows, the card drag, the corner keys, taps, keyboard and touch, reduced motion, 390 and 1280, light and dark, the framing in the void, the labels, the unlock, one clock, and the unmount. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still the same bytes, sha256 `2653460d479f4159922bff22fbb7d137c11c6cb192000eefc27aa0ce0a83a337`. Verdict: **accept with fixes**.

### Fixed

The angle slider lived under the citation. On an 800px window its top was 854. On a 390×844 phone its top was 1468. The control that opens the bend was off the page until the footer was scrolled. It now sits under the formula, at the top of the footer, and it sticks there while the cite scrolls. At 1280 the thumb ran from 511 to 527. At 390 it ran from 544 to 560. Both sit inside the window. The visible name is the degree, `Angle 31°`. The accessible value names the end: the set of c, the Julia set, or the plane between them.

A drag that started on the card, while the gesture was drag-c, moved c and left the angle. From −0.75 the formula became −0.201, and `slices` stayed 0. The card now owns that drag. The same gesture leaves c at −0.75, moves the angle (0.42 to 0.55 across the card), and counts one turn. On a phone the card is the lower pane, so the drag is vertical: up toward Julia, down toward the set of c. A sideways drag still turns the card when the panes sit side by side. A turn shorter than 0.02 does not count. Letting the slider go counts only when the angle changed. A key that is only repeating does not count again.

A tap on the card flashed a shape over the slice. The card is the angle. A tap there keeps the picture.

Shift and an arrow were dropped while the slider had focus, because every field ate the key. The focused slider also refused to show a turn made from the stage, so the thumb could sit on the old degree. Shift and the left or right arrow turn the plane from the slider as well as from the stage, and the thumb follows. A text or number field still keeps its own keys.

A corner drag lost to the same drag-c path. A press on the corner at 1, then a move, now changes the angles (90°, 90°, 90° became 83°, 89°, 100°) and leaves c at −0.75. The ratio stays 4. Keys 1, 2, and 3 ring that corner, on the plane and on the sphere, with the key’s digit on a chip, so Shift and an arrow have a visible target. A drag that starts on the sphere’s corner moves the same point. The hit radius is 22 CSS pixels, so a phone pixel ratio does not shrink the target.

The lone slice was full-bleed, and the citation covered the set. It is inset in the void, on the same clear band as the sphere. The stage ends above the solid footer. The stars show in the margin. The layout token is `inset`.

The card’s words were 13 canvas pixels of a generic face. At the page’s pixel ratio that is under 15 CSS pixels, and the fractal ate the blue and the purple. Julia, the degree, and “set of c” are chips in the teaching colours, on the page background, at least 15 CSS pixels, in the site face.

The bend sentence was six numbers, in the walk green. The idea is the ratio. The line is now “Excess over area is 4. Angles 90°, 90°, 90°. Excess 90°. The straight triangle in the plane has area 0.5.” The colour is the text colour, in light and in dark. The straight edges use that same text colour. The area wash follows |z|, so on a wide pane it meets the dashed unit circle. The lone sphere’s chart is a plate in the surface colour. The ball is that surface too, so the dark theme has a disc and the light theme has a disc.

A bake that finished while the tab was hidden stored the stamp and skipped the paint, so the canvas stayed on the old frame after the tab returned. The clock still draws nothing while the tab is hidden: a Shift nudge under `document.hidden` held `data-draws` at 65. The held frame paints when the tab is visible and the motion clock is idle. `pagehide` cancels that clock, stops the dwell timer, terminates the zoom worker, and disposes the three.js scene. `window.__pg.stop()` does the same, and a second `start` stops the first.

### Unlock

The level walk was left as the assembler has it. L7 is `metrics >= 2` and `flashes >= 3` and `history >= 20`, all required, after L6. L8 is `slices >= 2` and `history >= 24`, both required, after L7. A state with nine turns and 24 pictures, and no chordal readings, stays at 6. Twenty pictures and the L7 readings, with one turn short of 24, stay at 7. Two turns and 24 pictures, with the earlier readings, are 8. The bend cannot open before the family.

### Citations

Nothing numbered was invented. The slice cite still says the planes between the set of c and the Julia set are not in the book, and it still names Figure 4.2.13 [PDF Figure 4.6, page 114] and Exercise 4 for the disk at c = 0. The bend cite still says Exercise 14 is the coordinates, Exercise 2 is the circles, Chapter 9’s introduction is the angle-preserving projection, the course map stops before Chapter 9, and no exercise numbers the angle sum. The radius line, excess is 4 times the area, stays on the page as the measurement, with that gap beside it.

### Checked

`node tools/check_vectors.mjs` is 120/120. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the slider on screen, Shift+Left while the slider is focused, and a card drag that turns the plane and leaves c alone.

Headless Chrome, light and dark, at 1280×800 and 390×844. Slice, split slice, bend, and the lone excess. No sideways scroll. The slice stage is `inset`. The split stage is `split`. The badge on the octant reads excess over area 4. A playing scrub still draws. A paused scrub, and a hidden tab, draw nothing. That is the one clock, `motion.run` and `motion.drive`.

### For the mid reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” A session with no picture still says so. `films/shared/hostclock.js` was not edited.

The card is a picture of the angle. It is a schematic. It does not claim to be a coordinate projection of R⁴.

The 4D graph station, w = f(z), is a different 4D. These views do not link it.

The footer’s transparent fade still lies over the lower part of a split. The solid band stays clear of the stage. The global clear-band fraction was left where the sphere review set it.

Corner chips show the keys 1, 2, and 3. The complex values move, so the picture does not keep painting 0, 1, and i after a drag. The opening triangle is still those three points, and the badge is the measurement.

A higher power, a coloured Newton basin, a Julia set at a general c, the chordal distance, and the angle sum still have no exercise number. The cites say so. Chapter 9 is outside the course map, and the page says so. `kit/template/js/app.js` still has the old `mapForcedByRoute`. The live router is `js/app.js`.

Pull request 15 was not merged.

## PR #15 mid review

Branch `cursor/playground-l7-l8-7e75`, pull request 15, base `gh-pages`. The close review stopped at `e740442`. This pass asks whether L7 and L8 sit in the same course as Test 1. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `2653460d479f4159922bff22fbb7d137c11c6cb192000eefc27aa0ce0a83a337`. Verdict: **ready for the wide reviewer**. This pass does not merge.

### What the two pictures are

L7 is one plane turning in the four numbers (z, c). At one end the walk starts at 0 and the pixel is c: the set of c. At the other end the pixel is z: the Julia set of that c. That plane is Chapter 4, on the Test 2 map. Exercise 4 is the disk when c is 0. The planes between those ends are not in the book. The card is a picture of the angle.

L8 is the book’s sphere of diameter 1, the same sphere as the chordal distance and the same one 1/z stands on. The triangle opens on 0, 1, and i. The excess is 4 times the area. Chapter 9 says the projection keeps angles. Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. The course map stops before Chapter 9.

### The other 4D

The 4D graph station draws w = f(z): four numbers (x, y, u, v), three on the screen and one as colour. A footer chip that called this the same 4D would teach the false identity the site exists to refuse. A name has to say which object.

The family footer now carries “The 4D Graph, a different 4D”. The cite says this plane cuts (z, c), on the Test 2 map, and the graph is a different four numbers, on the Test 1 map. The bend does not carry that chip. The bend is the sphere plus the stereographic plane. The graph’s lede used to say every other picture on the site is a shadow of w = f(z). That sentence is now the modulus landscape and the Riemann sphere on that page. A plane through z and c is named as a different four numbers. The graph links back: “Playground: the plane through (z, c), not this graph.”

### Threads

The family wears T1, T2, T3, and F2. T1 is the slide, T2 is the square, T3 is the motion, and F2 is that rule done again. The badges open the Story Map. The Story Map chip still opens Test 1, which is where T1, T2, and T3 live. F2 opens Test 2. The footer names the stations those threads already use: the slide, Powers, a function as a motion, the orbit of 0, and the disk at c = 0. On the lone slice those Test 1 stations were missing. They are on the page now, because the rule is the same rule with or without the card.

The bend wears T1 and T3. T1 is the sphere: one point, a plane address and a point on the ball. T3 is the derivative. A move seen up close keeps angles, and that is the fact inside the course map. Chapter 9 is where the book says this projection does that. T2 stays off. T2 is the staircase of arg z. The angle sum is the bend of the sphere. A staircase badge on that picture would be a costume. F2 stays off. The bend is not the Julia rule.

The bend no longer inherits the fractal split’s stations. “Slide, Spin, Stretch, Mirror” and “A Function Is a Motion” are the square-then-slide rooms. The sphere’s rooms are 1/z and the Sphere, and the derivative.

### The fade

On the close-review build the stage cleared the solid 55% and the transparent fade still covered the picture. At 1280 the overlap was 154px. At 390 it was 157px. The lower pane is the card, or the sphere, or the plane chart in the corner of the lone excess. A wash over that pane reads as the picture dissolving.

Splits, the lone slice, and the excess now end at the top of a solid footer. Measured overlap is 0 at 1280 and at 390. The sphere, the height, and a lone plane keep the band the sphere review set. The void still floats its type. A measured picture sits the way a Test 1 station does: the picture, then the sentence on the ground.

### The parameter on the triangle

c was a purple ring on the same plane as the triangle, and the spherical region is already purple, so the ring read as a fourth corner. It is now the letter c, in the text colour. The cite says it is the parameter of the map, and it is not a corner. The bend formula dropped the chordal distance. Exercise 14’s lift stays. The other formula is the area scale of the wash, 1/(1+|z|²)². The page says no exercise numbers that scale.

### The kit router

`kit/template/js/app.js` keeps its `mapForcedByRoute`. That file is the scaffold. It reads `thread.maps` and returns the map that owns the thread. `kit/smoke.mjs` locks `#home-t2` through that lookup. The live router is `js/app.js`, which names T1–T3 and F1–F3 because this course’s threads do not carry a maps list. Copying that regex into the kit would hardcode this course into every later site. Left as it is.

### Citations

Nothing numbered was invented. Howell & Mathews only. The slice still names Figure 4.2.13 [PDF Figure 4.6, page 114] and Exercise 4, and still says the planes between the ends are not in the book. The bend still names Figure 2.5.2 [PDF Figure 2.22, page 73], Exercise 14, Exercise 2, and Chapter 9’s introduction. The angle sum, the area scale, the chordal distance, a higher power, a general c, and the coloured basins stay unnumbered, and the pages say so.

### Checked

`node tools/check_vectors.mjs` is 120/120. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the slider on screen, Shift+Left while the slider is focused, a card drag that leaves c alone, and the stage ending at a solid footer on the slice and the bend.

Headless Chrome, light and dark, at 1280×800 and 390×844. Slice, split slice, bend, and the lone excess. No sideways scroll. Overlap of the stage into the footer is 0. Screenshots: `/opt/cursor/artifacts/mid-review/before/` and `/opt/cursor/artifacts/mid-review/after/`.

### For the wide reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

The lab and the 4D graph are book chapter 4, and they sit on the Test 1 map. The switch still says Test 1 is Chapters 1 to 3. This pass did not relabel the switch. The family cite says the graph is on the Test 1 map.

Arrow keys on a nudge bend still move c. The letter on the plane follows. The triangle does not depend on c.

Story Map still opens Test 1. F2 is the door onto the Test 2 map. There is one Story Map chip.

On a 390px window the footer is about 374px, so the picture is the region above it. The card and the sphere are fully in that region. A shorter cite would buy a taller picture and would drop the sentences that tie the rooms together.

Pull request 15 was not merged.

## PR #15 wide review

Branch `cursor/playground-l7-l8-7e75`, pull request 15, base `gh-pages`. The close review stopped at `e740442`. The mid review stopped at `4d066c8`. This pass asks what L7 and L8 make the learner observe, whether L0 through L8 is one arc, and whether that arc serves Test 1 and Test 2. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `2653460d479f4159922bff22fbb7d137c11c6cb192000eefc27aa0ce0a83a337`. Verdict: **ready**. This pass does not merge.

### What the learner is asked to see

L0 is a question. The void writes one shape. The name stays, and the name is a door.

L1 moves c. The set changes, so c is a place.

L2 puts the parameter plane beside the set and says the walk settles, stays, or leaves. The set of c is those fates, collected.

L3 pinches. The edge has more edge.

L4 lifts the picture onto the book’s sphere. A walk that leaves ends at the north pole, one point. Newton is a different colouring: which root.

L5 raises the escape as a height. The colour called curvature is the bend of that height. It is not the sphere.

L6 is the same sphere as a distance. The orange corners are infinity, one point, and the height there is finite.

L7 turns one plane. At one end the walk starts at 0 and the pixel is c: the set of c. At the other end the pixel is z: the Julia set of that c. Between them the pixel is part z and part c, and the book does not draw that plane. The card beside the split is a schematic of the angle. It is the turn from a floor to a wall, with the real slice pasted on. It is not a coordinate projection of R⁴. The four numbers of this plane are (z, c). That is Chapter 4, on the Test 2 map.

L8 returns to the sphere from L6. The triangle opens on 0, 1, and i. Move a corner. The angles change and the area changes. Excess over area stays 4. The straight triangle in the plane has a different area. The wash is the chart’s area scale, heaviest at 0, and it is not the curvature colour from L5. The learner concludes that this sphere has one bend, the number 4, because the radius is 1/2. Chapter 9 says the projection keeps angles. The course map stops before Chapter 9. The derivative, on the Test 1 map, is that fact seen up close.

L8 is not a course in manifolds. It is one surface and one constant. The page does not say the word.

L8 follows L7 because the level walk does not skip. It is a return to the sphere, not a bend of the family plane. The triangle does not use c.

### Test 1 and Test 2

Test 1 is Chapters 1 to 3: two addresses, the square, a function as a motion, the derivative, and 1/z on the sphere. The family’s badges open those rooms, and F2 opens Test 2. L4, L6, and L8 are that sphere. L8’s extra door is the derivative.

Test 2 is Chapter 4: a sequence has a fate, square then slide, the Julia set, the set of c, the disk when c is 0. L0 through L3 and L7 are that chapter. Exercise 4 is the disk at the Julia end when c is 0. Figure 4.2.13 is the set of c. The planes between those ends are not in the book, and the page says so.

### Fixed

The card looked like a projection and the cite had to unsay it. The card now paints the word schematic, the caption names a schematic of the angle, and the cite says the card is a schematic and does not drop a coordinate.

The footer chip said “The 4D Graph, a different 4D”. That slogan does not say different from what. The chip is now “The 4D Graph of w = f(z)”. The cite names the other four numbers, x, y, u, v, and says that graph sits on the Test 1 map with the mappings. It is not Chapter 4.

Arrow keys on a nudge bend moved c. The letter followed. The triangle did not. The pad said “Move c”, and Closer and Farther were on the pad and did nothing. An arrow now moves the marked corner. So does the pad. Shift still moves it. A drag that is not on a corner does not move c. The hint says the arrows leave c where it is. A path may still carry c, and the hint says the triangle does not follow the loop.

The badge sat under the cite and the station list, so the number 4 was the sentence you scrolled to. The badge now sits under the formula and the angle slider. At 1280 and at 390 it is inside the visible footer.

The L7 line that waits for L8 used to say “the bend of the sphere”. L5 had already spent the word bend on the escape height. The waiting line now says the angle sum.

### The map residue

The lab and the 4D graph carry `chapter: 4` in the registry and they sit on the Test 1 map. That field is not a book chapter. The story map groups by part. Part V is “The diary and the index”, and the note is “Lab, 4D, problems”. The home map does not print the chapter field. The lab’s problems are 2.1.2, 2.1.3, 2.2.1, and 2.5.1. The graph’s topics are T2.2, T2.4, T2.5, and T3.1. Those are the mappings. Book Chapter 4 is the Test 2 map: sequences, Julia, Newton.

They stay on Test 1. Moving them would put the mapping lab on the Julia exam. The switch stays “Complex numbers, Chapters 1 to 3”. The family cite is what was wrong, and it now says the graph is not Chapter 4.

### The footer

The solid footer is capped at `min(46dvh, 22rem)`. On a 390×844 phone that is 374px. Overlap of the stage into that footer is 0. On the bend the picture above it was 342px, the badge was inside the footer, and the sentence “It is not Chapter 4” was inside it (the mark sat at 766, and the footer ran from 470 to 844). On a 1280×800 window the footer was 368px, the picture 344px, and the same sentence sat at 617 inside a footer that ran from 432 to 800. The graph chip sits lower, at 948 on that window and at 1764 on the phone. It is one scroll. The sentence it repeats is already on the first screen.

A shorter footer would buy a taller picture and would push that sentence off the phone. The cite was not cut.

### Citations

Nothing numbered was invented. Howell & Mathews only. The slice still names Figure 4.2.13 [PDF Figure 4.6, page 114] and Exercise 4, and still says the planes between the ends are not in the book. The bend still names Figure 2.5.2 [PDF Figure 2.22, page 73], Exercise 14, Exercise 2, and Chapter 9’s introduction. The angle sum, the area scale, the chordal distance, a higher power, a general c, and the coloured basins stay unnumbered, and the pages say so.

### Checked

`node tools/check_vectors.mjs` is 120/120. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the slider, Shift+Left on the focused slider, a card drag that leaves c alone, the stage ending at a solid footer, and an arrow on the bend that changes the corner and leaves the formula’s c.

Headless Chrome, light and dark. The split slice at 1280 and at 390. The bend at 1280, light and dark, and at 390. An arrow on the phone bend took the octant from angles 90°, 90°, 90° and plane area 0.5 to angles 90°, 90°, 83° and plane area 0.47. The ratio stayed 4. Screenshots: `/opt/cursor/artifacts/wide-review/`.

### Residue

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

A c-path on the bend can still move the letter. The hint says the triangle does not follow it. The arrows do not move it.

The graph chip is below the first screen. The cite on that screen already names the four numbers and says the graph is not Chapter 4.

A higher power, a coloured Newton basin, a Julia set at a general c, the chordal distance, the angle sum, and the area scale still have no exercise number. The cites say so. Chapter 9 is outside the course map, and the page says so. `kit/template/js/app.js` still has the old `mapForcedByRoute`. The live router is `js/app.js`.

`c = 1/4 + 1e-9` Leaves in `settle()`. A start that is not 0, past the cusp, can still read Settles on a station disk if the lookahead runs out. The playground does not show that word for the orbit of 0.

Pull request 15 was not merged.

## PR #16 close review

Branch `cursor/playground-l9-roots-d921`, pull request 16, base `gh-pages`. Zoom: the new controls and the layout. The degree slider, Lower and Higher, the arrows, + and −, taps on either pane, keyboard and touch, reduced motion, 390 and 1280, light and dark, the framing in the void, the labels, the unlock, one clock, and the unmount. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still the same bytes, sha256 `c6ac91f30168a8b7790fb633c05f936c7c528c381fdafc602ca1c0e31ea7d4fb`. Verdict: **accept with fixes**. This pass does not merge.

### Fixed

The split was one bitmap squeezed into the left column. At 1280 the canvas was 640×345 on a 1280×345 stage, and the right half was stars. At 390 it was 195×342 on a 390×342 stage, so the stacked picture lived inside the left column. The slice and the bend already span both columns. The roots split does the same. The canvas is the stage: 1280×345 and 390×342. The stars stay in the header margin.

Two ribbons are too narrow on a phone. Under 480px the split stacks, basins on top and the set of c underneath, the same grid the chordal split, the slice, and the bend already use. The hint follows the stack. At 1280 it says the right pane. At 390 it says the lower pane. A resize that crosses that width rebuilds the sentence, so a window that was wide does not keep saying “right pane” after it becomes a phone.

The degree pad was a compass. Up, Down, Left, and Right all stepped the degree, so the labels lied. The pad is now Lower and Higher. Lower is ArrowDown. Higher is ArrowUp. On a nudge, + and − are those same steps. A pinch still zooms the basins, and the set of c keeps its window. The slider stays. It is the named control, from 3 to 5, and it sticks under the formula.

The phase lock turned every control back on when the picture settled, so Lower was enabled at degree 3. The ends go back on once the picture is idle. At degree 3, Lower is off and Higher is on. At degree 5, Higher is off. The disabled button is the same 0.45 opacity as the rest of the page.

The Newton step drew the exponent as a second subtraction. The source was `^{d-1}`, so degree 3 rendered a superscript 3−1 and degree 4 rendered 4−1. KaTeX does not evaluate that. The exponent is the integer. Degree 3 is `z_{n+1}=z_{n}-\dfrac{z_{n}^{3}-1}{3\,z_{n}^{2}}`. Degree 4 puts `z_{n}^{3}` in the denominator. The lone formula uses `z_n` as well, and it stays one line. At 1280 the formula is 17.85px and does not overflow. At 390 it is 15.64px and does not overflow.

The pinned slider name was 14.45px and muted. The degree, and the angle beside it, are the control. The name is 15.98px, weight 600, in the text colour, in light and in dark.

Degree 3 still says “Each colour is one root of 1.” Degree 4 names the mix: blue, orange, and purple are three roots, and the fourth mixes blue and orange. Degree 5 adds that the fifth mixes orange and purple. A blend is a root. It is not a boundary, and it is not a fifth ink. Green stays the guess and is not drawn on this picture.

The pane names sit on a plate, at least 15 CSS pixels, in the site face. “roots of 1” is the text colour, so it is not another root. “set of c” is the orange of the ring, and it is drawn on the power pane only. They are painted when the picture is still, and when reduced motion has landed. They are not baked into the low-resolution bitmap.

“One touch drives both panes” was false here. A tap on a basin names the root and leaves c. A tap on the set of c moves the ring. The basins do not use that c. The other splits still say one touch drives both panes. The screen-reader key names Lower, Higher, the basin tap, and the ring.

### Unlock

The level walk was left as the assembler has it. L9 is `bends >= 2` and `history >= 28`, both required, after L8. L8 is `slices >= 2` and `history >= 24`. With the earlier gates filled: two slices, no bends, and 24 pictures stay at 8. Two bends, two slices, and 27 pictures stay at 8. Two bends, two slices, and 28 pictures are 9. Two bends and 28 pictures with no slices, or with one slice, stay at 7. The roots cannot open before the family, and they cannot open before the bend. `degrees` is a diary count. It is not a gate.

### Citations

Nothing numbered was invented. Equation 1.5.5 is the d-th roots of 1. §4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3] colour z³ + 1. This picture colours z^d − 1, the same sign as the Newton station. Exercises 1 and 2 are the half-planes. Exercise 3 is a line, the cubic Newton line, with Example 4.2.1. The other pane is the set of c for this power. It is not Figure 4.2.13.

Citations needing Shael, still unnumbered, and the page says so: the coloured basins, a higher power, and a figure that colours the basins for degree 4 or 5. No exercise number was added for any of those.

### Checked

`node tools/check_vectors.mjs` is 136/136. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including Lower off and Higher on at degree 3, the Newton step in `z_n`, the degree slider to 5, the split canvas matching the stage, a solid footer with overlap 0, the right-pane sentence at 1280, and the lower-pane sentence at 390.

Headless Chrome, light and dark, at 1280×800 and 390×844. Lone unity and the split. No sideways scroll. Overlap 0. The footer cover is solid. Stage bottom and footer top meet at 432 on the wide window and at 470 on the phone.

One clock, `motion.drive` and `motion.run`. A playing scrub on the roots moved `data-draws` from 147 to 164. A paused scrub held 164. A hidden tab held 164. Reduced motion settled at idle, 165, and stayed 165. `pagehide` removed `window.__pg`.

Screenshots, before and after: `/opt/cursor/artifacts/close-review/before/` and `/opt/cursor/artifacts/close-review/after/`. The before split is the half-width canvas and the compass. The after split is the full stage, the integer exponent, and Lower off at degree 3.

### For the mid reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

The cusp sentence was left in the assembler. `c = 1/4` still Settles. A real start just past the cusp reads Leaves.

The fourth root mixes blue and orange. The fifth mixes orange and purple. Those are the three teaching inks. A new colour was not added.

A pinch zooms the basins. The set of c keeps the fixed power window. A drag on that pane moves the ring and leaves the basin formula’s step alone.

`kit/template/js/app.js` still has its own `mapForcedByRoute`. The live router is `js/app.js`. This pass did not edit either.

Pull request 16 was not merged.

## PR #16 mid review

Branch `cursor/playground-l9-roots-d921`, pull request 16, base `gh-pages`. The close review stopped at `2cd5ff6`. This pass asks whether L9 sits in the same course as Test 1, and whether it is the right picture after L8. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `c6ac91f30168a8b7790fb633c05f936c7c528c381fdafc602ca1c0e31ea7d4fb`. Verdict: **ready for the wide reviewer**. This pass does not merge.

### Where L9 sits

L8 ended the sphere. Excess over area stays 4, and that number does not need another triangle. L9 leaves the sphere. The roots of 1 are the points Test 1 already put on the unit circle, Equation 1.5.5, the same points the roots station and Powers teach. Newton’s walk colours which of those points the step finds. That colour is Chapter 4. The split asks the other Chapter 4 question, the set of c, for the same power, and that c does not move the basins.

The waiting line on L8 now says the roots of 1 are next, and that the question is which root the walk finds. The cite on L9 says the angle sum was the sphere, and these roots sit on the unit circle.

### Threads

T2 is the staircase. The roots of 1 divide it into equal steps. The badge stays.

T1 is one point, two addresses. Each root is length 1 at the equal step, and a tap names the Cartesian pair. The badge stays, and the cite says that.

T3 is the derivative. The step is z minus p(z) over p'(z). That derivative is Chapter 3, on the Test 1 map. The basins are not the microscope. The badge stays because the step is built from that move, and the footer opens the derivative.

F3 was missing. The colour is which root the walk finds. That is the Newton station’s thread. Both the lone picture and the split wear it. The mark is the green diamond the Test 2 map already uses for F3. The picture does not paint that green.

F2 was on the lone picture. The lone basins are not square, then slide. F2 stays on the split, where the other pane is z^d + c. It comes off the lone picture.

F1 stays off. The fate word on this picture is which root. Settles, stays, and leaves are the other walk. A tap on a basin names the root even when the composition’s reveal is a verdict. Enter does the same.

### The footer

L9 had inherited the sphere and the cardioid. The sphere is L8. The cardioid is the quadratic set of c, and the cite already says this pane is not Figure 4.2.13. Both doors are gone from this picture.

The doors are Story Map, Newton Fractals, Roots, Powers, and the derivative. Story Map opens Test 1. F3 and, on the split, F2 open Test 2. The split adds The Mandelbrot Set and Julia. The Mandelbrot title says this pane asks that question for this power. The Julia title says Julia is the z-plane of one c, and this pane is the set of c.

### The course map

Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. These roots are Chapter 1. The colour is Chapter 4. That sentence is the first line of the roots paragraph, so the phone’s first screen carries it. On the lone picture at 1280 the phrase sat at 584, inside a footer that ran from 432 to 800. On the split it sat at 639, in the same footer. On a 390×844 phone it sat at 778, inside a footer that ran from 470 to 844.

The thread badges sit one scroll below that screen. At 1280 they were at 823 on the lone picture and at 948 on the split. On the phone they started at 1365. The sentences those badges repeat are already on the first screen, in the cite and in the badge under the formula. The badges were not pulled up over the picture.

### The three inks

A 45% blend of the light-theme blue `#0b63ad` and orange `#a84300` is about rgb(82, 85, 95), a slate. A 45% blend of that orange and the purple `#9d3a8a` is about rgb(163, 63, 62), a brick. Those are new colours. The cite would have had to unsay them. The extra roots are stripes of the two inks instead. Degree 4’s fourth root is blue and orange. Degree 5’s fifth is orange and purple. The bands are wide enough to survive the scale-up from the bake. The dark seam is still the late arrival, pulled toward the ground, the same way the Newton station darkens a boundary.

A sample of the left pane at degree 4, light, 1280, counted blue, orange, and purple, and 0 green pixels. The same count at degree 3 and degree 5 was 0 green. Green remains the guess. It is not a root on this picture. The F3 badge is the thread, in the footer.

### The fixed window

A pinch still zooms the basins. The set of c keeps span 2.4 about 0. That window is the census. Zooming it would turn the comparison into two zooms and hide the fact the picture is there to show: as the degree rises, the set of c shrinks inside the same window. Degree 5’s set is the smaller body in that pane. The cite says the window stays.

### The kit router

`kit/template/js/app.js` keeps its `mapForcedByRoute`. The scaffold reads `thread.maps`. `kit/smoke.mjs` locks `#home-t2` through that lookup. This course’s threads do not carry a maps list. The live router is `js/app.js`, which names T1–T3 and F1–F3. Copying that test into the kit would hardcode this course into every later site. Left as it is.

### Type

The Newton step is still KaTeX. At 1280 the formula is 17.85px. At 390 it is 15.64px. The degree name is 15.98px, weight 600, in the text colour, in light and in dark. The badge is 17px in the display face, in the text colour. The thread badges are 13.94px, weight 600, the same 0.82rem rule as a Test 1 station. They were not enlarged. A control is 15px. A badge is the station’s badge.

### Citations

Nothing numbered was invented. Howell & Mathews only. Equation 1.5.5 is the d-th roots of 1. §4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3] colour z³ + 1. This picture colours z^d − 1. Exercises 1 and 2 are the half-planes. Exercise 3 is a line. The other pane is not Figure 4.2.13.

Citations needing Shael, still unnumbered, and the page says so: the coloured basins, a higher power, and a figure that colours the basins for degree 4 or 5. No exercise number was added for any of those.

### Checked

`node tools/check_vectors.mjs` is 136/136. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including F3 on the lone picture, F2 absent there, the map sentence, the stripes at degree 5, and the split’s Mandelbrot and Julia doors with the cardioid and the sphere gone.

Headless Chrome, SwiftShader, light and dark, at 1280×800 and 390×844. Lone degree 3, lone degree 5, split degree 4, split degree 5. No sideways scroll. Overlap of the stage into the footer is 0. Screenshots: `/opt/cursor/artifacts/mid-review/`.

### For the wide reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

The thread badges and the station list are one scroll below the first screen. The cite on that screen names the two maps, and the badge under the formula names the colours and, on the split, the other pane.

The set of c does not zoom. The basins do. The cite says why.

`c = 1/4` still Settles. A real start just past the cusp reads Leaves. That sentence is still the assembler. The playground does not show it on this picture.

`kit/template/js/app.js` still has its own `mapForcedByRoute`. The live router is `js/app.js`.

Pull request 16 was not merged.

## PR #16 wide review

Branch `cursor/playground-l9-roots-d921`, pull request 16, base `gh-pages`. The close review stopped at `2cd5ff6`. The mid review stopped at `86b5fa7`. This pass asks what L9 makes the learner observe, whether L0 through L9 is one arc, and whether that arc serves Test 1 and Test 2. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `c6ac91f30168a8b7790fb633c05f936c7c528c381fdafc602ca1c0e31ea7d4fb`. Verdict: **ready**. This pass does not merge.

### What the learner is asked to see

L0 is one shape. Square, then slide by c.

L1 moves c. The set changes, so c is a place.

L2 puts the parameter plane beside the set. The line says settles, stays, or leaves. The set of c is those fates, collected.

L3 pinches. The edge has more edge.

L4 lifts the picture onto the book’s sphere. A walk that leaves ends at the north pole, one point. Newton is a different colouring: which root.

L5 raises the escape as a height. The colour called curvature is the bend of that height. The page already keeps that bend off the sphere.

L6 is that sphere as a distance. The orange corners are infinity, one point, and the height there is finite.

L7 turns one plane. At one end the walk starts at 0 and the pixel is c. At the other end the pixel is z, the Julia set of that c. Between them the book draws nothing.

L8 returns to the sphere. Move a corner. Excess over area stays 4. The radius is 1/2. Another triangle would say the same number.

L9 leaves the sphere. The points are the d-th roots of 1, Equation 1.5.5, the same points Powers and the roots station put on the unit circle. The colour is which of those points Newton’s walk finds. That colour is Chapter 4. On the split, the other pane asks the other Chapter 4 question for this power: which c keep the walk from 0 bounded. That c is the ring. The basins are z^d − 1. They do not use it.

The learner concludes two things, and they stay separate. Newton’s step on the roots of 1 lands on one root, and the colour names it. The set of c for z^d + c is the orbit of 0, and it shrinks inside one window as the degree rises. Degree 5’s body is the smaller one.

### Test 1 and Test 2

Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. L0 through L3 and L7 are Chapter 4’s walk. L4, L6, and L8 are the sphere from Chapter 2, and L4 also plants Newton’s colour. L5 is the escape height, which the page does not number. L9 is the join the earlier levels were walking toward: Chapter 1’s roots, coloured by Chapter 4, with Chapter 4’s set of c beside them for a higher power. The order is the right order. The sphere had to finish before the roots opened, because the level walk does not skip, and the roots do not need another triangle. The assembler was left as it is.

### Fixed

The split formula was one aligned system: the Newton step, then f_c(z) = z^d + c, with c on the second line. A learner reads that as one map, and reads c as a parameter of the basins. The basins do not use c. The footer now asks two questions, each with its own formula. “Which root does Newton find?” sits on z_{n+1} = z_n − (z_n^d − 1)/(d z_n^{d−1}). “Which c keep the walk from 0 bounded?” sits on z_0 = 0, z_{n+1} = z_n^d + c. The caption above the picture asks the same questions, so they are on the first screen before the footer. The chips on the panes say “which root” and “which c stay bounded”.

The old sentence called the fourth and fifth roots an extra root, in stripes. A stripe can be counted as a further root, or as a boundary. The page now says a stripe is one root, painted in two inks. Degree 4 has four roots. The fourth is a stripe of blue and orange. Degree 5 has five roots. The fifth is a stripe of orange and purple. The number of roots is the degree. Green stays the guess, and this picture does not paint it.

A sample around the fourth root at degree 4, light, 1280, counted 2127 blue pixels and 1514 orange pixels. At degree 5 the fourth root’s neighborhood was 361 blue and 617 orange, and the fifth was 567 orange and 408 purple. The three named roots stay one ink each. On a 390 phone the fourth root’s neighborhood was 567 blue and 293 orange. The bands survive the scale-up.

The set of c does not zoom. The basins do. That window is the census: the same frame shows the set shrink as the degree rises. The badge, the hint, and the cite say the pane keeps one window. The behavior stays.

### The first screen

At 1280×800, split, degree 4, light, the caption ends at 104 and holds both questions and the stripe sentence. The two formula questions sit at 447–470 and 521–544. The footer runs from 432 to 799, so both questions are inside it, and the badge (614–683) is inside it, including the inks and the window. The cite starts at 687, so “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” is on that screen. The thread badges start at 1043.

At 390×844 the caption ends at 105 and holds both questions. The formula questions sit at 480–503 and 549–572, inside a footer that runs from 470 to 843. The degree-4 badge ends at 802. The degree-5 badge ends at 825. Both are inside the footer. The cite starts at 806, so the visible sliver is the book line, Howell & Mathews, Chapter 1, § 5. The chapter sentence is the next line. The thread badges start at 1579.

The badges stay one scroll down. Five chips pulled up over the picture would hide the basins. The questions those badges repeat are already in the caption. On the phone the words “Chapter 1” and “Chapter 4” are one line below the fold. The questions above them are those two chapters. The caption was not lengthened to drag the sentence up. A longer caption would shrink the panes.

Overlap of the stage into the footer is 0. The page does not scroll sideways. The formula does not scroll sideways. At 1280 the split stage is 313px tall. At 390 it is 296px, basins on top and the set of c underneath.

### Citations

Nothing numbered was invented. Howell & Mathews only. Equation 1.5.5 is the d-th roots of 1. §4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3] colour z³ + 1. This picture colours z^d − 1. Exercises 1 and 2 are the half-planes. Exercise 3 is a line. The other pane is not Figure 4.2.13.

Citations needing Shael, still unnumbered, and the page says so:

- The coloured basins. No exercise numbers them.
- A higher power, z^d + c for d > 2, and the set of c for that power. No exercise numbers a higher power.
- A figure that colours the basins for degree 4 or 5. No figure in the repo does.

The stripe is the picture’s ink. It is not a new theorem, and no exercise number was added for it.

The pull request’s opening note still says a fourth root mixes blue and orange. The page says a stripe.

### Checked

`node tools/check_vectors.mjs` is 136/136. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including both questions on the wide first screen and on the phone, the stripe sentence, z_0 = 0 on the second formula, and no aligned stack.

The formula text in that smoke is read with whitespace collapsed. The pattern is `\\s` inside the template string. A single `\s` there is a syntax error, and the class never reaches the page.

Headless Chrome, SwiftShader, light and dark, at 1280×800 and 390×844. Lone degree 3, lone degree 5, split degree 4, split degree 5. Screenshots: `/opt/cursor/artifacts/wide-review/`.

### Residue

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

The thread badges are one scroll below the first screen. On the phone, “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” is the line after the book citation.

The set of c keeps one window. A pinch zooms the basins.

`c = 1/4` still Settles. A real start just past the cusp reads Leaves. That sentence is still the assembler. The playground does not show it on this picture.

`kit/template/js/app.js` still has its own `mapForcedByRoute`. The live router is `js/app.js`.

The roots picture is still a CPU bake, capped on the long side. It is coarser than a GPU Julia plane.

Pull request 16 was not merged.

## PR #17 close review

Branch `cursor/playground-l10-diary-5d54`, pull request 17, base `gh-pages`. Head at kickoff `48695b7`. Zoom: controls and layout. Can the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen, on a phone and on a desktop? `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `ff41b00920f378afca136768bf3fbc8b88120398e02d56a55d87c656f6ac4e2d`. Verdict: **accept with fixes**. This pass does not merge.

### Fixed

The phone header stacked five thread chips. At 390×844 the roots header was 447px tall and the stage was 22px, so a thumb could not land on a basin. The chips did not overlap the stage. They ate it. Under 480px the chips are one row under the caption, and that row scrolls sideways. The flex item is the `li`. Shrinking the anchor wrapped each label into a tall chip and brought the stack back. The labels stay one line. At 390 the row runs from 111 to 157. T1, T2, and part of T3 are in view. F3 and F2 are one sideways swipe along that same row. The roots stage is 241px. The diary stage is 264px. A split stacks inside that height, so each pane is about 120px. Nothing covers the basins.

Lower and Higher lived under the citation. On the phone they started at y=2015. On the 1280 window they started at y=1226. The degree slider was already on the first screen. The two buttons now sit in that same row. The range gives up width so the row does not scroll sideways. At degree 4 both buttons are inside the visible footer, on both sizes. At degree 3, Lower is off and Higher is on.

Putting the buttons in that row pushed the citation down. On the phone the first line had been fully inside the glass and then ended at y=849, five pixels past an 844 window. The degree row drops its extra padding on a phone, and the second formula question tightens its top gap. The line “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” is still the first line of the citation, it stays on one line (it is 310px in a 366px measure), and its bottom is y=838.

The diary flash measured the band before the caption grew, so the stage ran 6px under the footer. A resize observer remeasures the header and the footer and sets the band again. It disconnects on `pagehide`, with the rest of the clock. At the hold, overlap is 0 and the picture starts 1px below the header. The dust is on the stage, not a blank starfield. A drag on the phone diary moved c from 0.26 to about −0.225 − 0.218i and wrote that Julia set back. The note still read “No headset session. The shape stays in the void.”

A roots shader that does not compile already returned false from `bakeUnity`, and the CPU bake ran. A thrown draw now takes that same path. A shader with a deliberate syntax error, then reverted, baked `cpu`, filled the stage, and logged nothing.

### Citations

Nothing numbered was invented. Howell & Mathews only. The citation list that needs Shael is unchanged.

Citations needing Shael, still unnumbered, and the page says so:

- The set of c as an index that writes the Julia set back. The book does not number that.
- The coloured basins. No exercise numbers them.
- A higher power, z^d + c for d > 2. No exercise numbers a higher power.
- A figure that colours the basins for degree 4 or 5. No figure in the repo does.

### Checked

`node tools/check_vectors.mjs` is 149/149. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including a phone stage at least 160px, Lower and Higher inside the visible footer, the chapter sentence fully inside that footer, and a diary flash that has painted before the shot. `node kit/smoke.mjs` exits 0.

Headless Chrome at 1280×800 and 390×844. Roots split and diary, lone and stacked. No sideways page scroll. Overlap of the stage into the footer is 0 once the picture is still. The roots bake reads `gpu` when the shader compiles.

Screenshots: `/opt/cursor/artifacts/l9-badges-1280.png`, `/opt/cursor/artifacts/l9-badges-390.png`, `/opt/cursor/artifacts/l10-diary-1280.png`, `/opt/cursor/artifacts/l10-diary-390.png`, `/opt/cursor/artifacts/l10-diary-flash.png`.

### For the mid reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” Select still flashes. `films/shared/hostclock.js` was not edited.

On a wide window the badges still wrap to two rows and end at 212, not at the 122 the build note claimed. They do not cover the basins. The stage there is 205px. This pass did not pull that wrap into one row.

On a phone, F3 and F2 sit in the badge row past the right edge. The row is on the first screen. The swipe is the way to them. Stacking them had left the basins 22px tall.

The chapter sentence on the phone roots picture ends at y=838 of 844. It fits. A larger font would clip it.

The set of c keeps one window on the roots split. A pinch zooms the basins. On the diary, a pinch zooms the index, and the Julia pane keeps its window.

`c = 1/4` still Settles. A real start just past the cusp reads Leaves. The diary shows that. The assembler was left as it is.

`mapForcedByRoute` lives in `kit/template/js/core/map-route.js`. The kit router and `js/app.js` are wrappers.

Pull request 17 was not merged.

## PR #17 mid review

Branch `cursor/playground-l10-diary-5d54`, pull request 17, base `gh-pages`. The close review stopped at `d7428d9`. Zoom: site tie-in and Test 1 quality. Threads, Story Map doors, badges, footer links, citation honesty, and the way L10 sits on the map beside L7–L9. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `ff41b00920f378afca136768bf3fbc8b88120398e02d56a55d87c656f6ac4e2d`. Verdict: **accept with fixes**. This pass does not merge and does not redeploy.

### Where L10 sits

L9 colours which root Newton finds. L10 is the other Chapter 4 picture: the set of c as an index of Julia sets. Touch a point and that c’s Julia set writes back. One piece when the orbit of 0 stays in, dust when it leaves. A real start past the cusp is the outside case, and this index is the picture that shows it.

The playground station summary now says that, in the same sentence run as L7, L8, and L9. L10 is not its own Story Map stop. L7, L8, and L9 are not either. The playground stays one place, `threads: []`, and it is still not a Next stop. `mapForcedByRoute` still lives only in `kit/template/js/core/map-route.js`.

### Threads

T1 stays. c is one point, with two addresses. The cite says that.

T2 stays. The square is the multiply turn, and the footer opens Powers.

F1 stays, on the lone picture and on the split. The colour is the fate of the orbit of 0. The footer opens that orbit.

F3 stays on the roots picture, lone and split. The colour there is which root the walk finds. The diary’s colour is the fate of the orbit of 0, so the diary leaves F3 on the roots picture. That is the same cut as PR #16.

F2 comes off the lone diary. The standing index is the set of c. Square, then slide is the Julia set. F2 stays on the split, where the other pane is that set, and the cite names it there. A flash keeps the standing row, so the header does not gain a chip while the ink is writing. The caption on the flash still says this is the Julia set that c writes back.

### The wide badge row

On the roots split at 1280×800 the five chips still wrap. T1, T2, and T3 sit at y=110–157. F3 and F2 sit at y=165–212. The stage is 205px, from 227. That wrap is the Test 1 lede: chips wrap inside the caption’s measure. A sideways row on a wide window would hide F3 and F2, and those two are the Chapter 4 join this split is there to show. The row stays wrapped.

The lone diary, with F2 off, is one row. T1, T2, and F1 end at y=125. The stage there is 292px. The chapter sentence sits at y=614–634, inside a footer that runs to 799.

### The phone row

Under 480px the chips stay one sideways row. Stacking them had left the basins 22px tall, and this pass does not stack them again.

On the roots split at 390×844, T1 is in view, T2 meets the right edge, and T3, F3, and F2 are one swipe along that same row. The row runs from 111 to 160. The stage is 241px. The chapter sentence ends at y=838 of 844, and it is inside the footer. It stays at that size.

On the lone diary at 390 the row is T1, T2, and F1. T1 is in view. T2 and F1 are one swipe. The stage is 264px. The chapter sentence sits at y=666–686.

### The footer

The diary opens Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and the cardioid. Story Map writes Test 1. Powers is the square, on the Test 1 map. Julia is the set that writes back. The Mandelbrot set is this index on the Test 2 map. The orbit of 0 is the colour. The disk is Exercise 4. The cardioid is Exercise 10. Newton stays on the roots picture.

The past-cusp badge says the index writes dust. c = 0.26 reads Outside, writes dust, Leaves, Exercise 8. c = 0 reads Inside, writes one piece. c = 1/4 still settles. The two questions stay two blocks: which c keep the walk from 0 bounded, and what Julia set this c writes back.

### Citations

Nothing numbered was invented. Howell & Mathews only. The citation list that needs Shael is unchanged.

Citations needing Shael, still unnumbered, and the page says so:

- The set of c as an index that writes the Julia set back. The book does not number that.
- The coloured basins. No exercise numbers them.
- A higher power, z^d + c for d > 2. No exercise numbers a higher power.
- A figure that colours the basins for degree 4 or 5. No figure in the repo does.

### Checked

`node tools/check_vectors.mjs` is 149/149. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including F2 off the lone diary and on the split, the chapter sentence inside the phone footer, and a diary flash that has painted before the shot. `node kit/smoke.mjs` exits 0. `#home-t2` still forces test 1.

Headless Chrome at 1280×800 and 390×844. Roots split and diary, lone and stacked. No sideways page scroll. Overlap of the stage into the footer is 0 once the picture is still.

Screenshots: `/opt/cursor/artifacts/l9-badges-1280.png`, `/opt/cursor/artifacts/l9-badges-390.png`, `/opt/cursor/artifacts/l10-diary-1280.png`, `/opt/cursor/artifacts/l10-diary-390.png`, `/opt/cursor/artifacts/l10-diary-flash.png`.

### For the wide reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” Select still flashes. `films/shared/hostclock.js` was not edited.

On a wide window the roots split still wraps to two rows and ends at 212. The stage there is 205px. That wrap is the Test 1 lede. The lone diary is one row.

On a phone, the chips that do not fit are one swipe along the first-screen row. On the roots split those chips are T3, F3, and F2. On the lone diary they are T2 and F1.

The chapter sentence on the phone roots picture ends at y=838 of 844. It fits.

The set of c keeps one window on the roots split. A pinch zooms the basins. On the diary, a pinch zooms the index, and the Julia pane keeps its window.

`c = 1/4` still Settles. A real start just past the cusp reads Leaves, and the badge says that c writes dust.

`mapForcedByRoute` lives in `kit/template/js/core/map-route.js`. The kit router and `js/app.js` are wrappers.

L10 is a view on the playground station. It is not a new stop on the Story Map.

Pull request 17 was not merged.

## PR #17 wide review

Branch `cursor/playground-l10-diary-5d54`, pull request 17, base `gh-pages`. The close review stopped at `d7428d9`. The mid review stopped at `b64ad68`. This pass asks what the diary makes the learner notice. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `ff41b00920f378afca136768bf3fbc8b88120398e02d56a55d87c656f6ac4e2d`. Verdict: **ready**. This pass does not merge and does not redeploy.

### What the learner is asked to see

L9 colours which root Newton finds. The other pane, when it is there, asks which c keep the walk from 0 bounded. That c is a ring. The basins do not use it.

L10 is the other question. The picture is the set of c, and the orange ring is this c. A touch writes that c’s Julia set back across the void. On the index the colour is the fate of the orbit of 0. On the flash the colour is how fast the walk leaves. One piece when that orbit stays in. Dust when it leaves. The boundary is c = 1/4. The opening ring sits at 0.26, just past the cusp, so the first picture is the outside case.

### The five questions

The first screen asks the question before the controls. The caption is “The set of c is an index of Julia sets. The orange ring is this c. Touch it. That Julia set writes back across the void.” There is no degree slider. The badge under the picture is the verdict, and it names the ring, so “writes dust” is what a touch does and not a name for the blue body.

The diary is not a second skin on the basins. L9’s colour is which root. L10’s colour, on the standing picture, is the fate of the orbit of 0, and the flash is a different picture, the Julia set of the marked c. The caption on that flash says so. The shared formula “Which c keep the walk from 0 bounded?” stays under the picture, because that is the index. The write-back is the other block.

The flash is the diary roll, 2.4 s, low escape times first, then the stars return. In the first part of a second the ink is still partial. By the time the shape has landed, the field is full, and at c = 0.26 the colour crowds into the cauliflower the cusp just left. That crowding is how fast the walk leaves. The set has come apart. The caption and the badge say both sentences while the picture is up. The blur settle is skipped on this flash, so the answer does not sit through a focus pull. The roll itself is unchanged. A sparser ink would be a different picture, and this pass did not bake a new one.

The boundary is one sentence, not three ways of saying outside. At c = 0.26 the badge says the ring is just past the cusp, Outside, a touch writes dust, Leaves, and the boundary is c = 1/4, which still settles. At c = 1/4 the badge says on the cusp, it still settles, and a touch writes one piece. At c = 0 the badge says Inside, writes one piece, and names the same boundary. Exercise 8 stays on all three.

The badges teach the mechanism when they are on the screen. T1 is one point, two addresses. T2 is the square. F1 is the fate of the sequence. On a wide window all three are in the row. The doors are the Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and the cardioid. They live in the footer, under the citation, so the first screen can ask the question. They are the map, once the learner reaches them.

### Fixed

The standing badge used to answer “writes dust” as a run of synonyms, with c = 1/4 in the last clause, while the learner was looking at a filled cardioid. It now points at the ring and names the boundary before it repeats Exercise 8.

The flash kept that same sentence over a picture that looks filled. While the Julia set is the picture, the first sentence is that the colour is how fast the walk leaves, and that past the cusp the set has come apart.

The hint said the gesture twice. It says it once, and it names the ring.

Next was sticky at the bottom of the footer. On the phone roots picture it sat on the chapter sentence. It now sits with Story Map and Theme. The chapter sentence is the first line of the citation, and nothing covers it. On the phone roots picture that line still starts at y=802.

The diary flash no longer runs the blur settle. L0’s roll still does.

### The first screen, after the caption grew

At 1280×800 the lone diary caption is two lines and ends at 104. The stage is 260px, from 172 to 432. It was 292px when the caption was one line. T1, T2, and F1 are one row. Both formula questions are in the footer. The badge names the ring at 0.26 and the boundary at 1/4. The chapter sentence starts at 613.

At 390×844 the same caption is on the first screen. The stage is 241px. T1 is in view. T2 and F1 are one swipe, which is the row mid left. Next is in the header, from 173 to 219, and the stage starts at 229.

The roots split at 1280 is unchanged: five chips, two rows, stage 205px. At 390 the roots stage is 241px, and the chapter sentence still starts at 802.

### Citations

Nothing numbered was invented. Howell & Mathews only. The citation list that needs Shael is unchanged.

Citations needing Shael, still unnumbered, and the page says so:

- The set of c as an index that writes the Julia set back. The book does not number that.
- The coloured basins. No exercise numbers them.
- A higher power, z^d + c for d > 2. No exercise numbers a higher power.
- A figure that colours the basins for degree 4 or 5. No figure in the repo does.

### Checked

`node tools/check_vectors.mjs` is 149/149. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the cusp badge, the flash, and the phone split. `node kit/smoke.mjs` exits 0. `#home-t2` still forces test 1.

Headless Chrome at 1280×800 and 390×844. The standing badges at c = 0.26, c = 1/4, and c = 0 match the three sentences above. During the roll the caption says the colour is how fast the walk leaves, and that this c writes dust. Next’s hits are the button, not the citation.

Screenshots: `/opt/cursor/artifacts/l9-badges-1280.png`, `/opt/cursor/artifacts/l9-badges-390.png`, `/opt/cursor/artifacts/l10-diary-1280.png`, `/opt/cursor/artifacts/l10-diary-390.png`, `/opt/cursor/artifacts/l10-diary-flash.png`. The phone diary shot is the stacked split at c = 0, the inside case. The wide shot is the lone index at c = 0.26.

### Residue

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” Select still flashes. `films/shared/hostclock.js` was not edited.

On a wide window the roots split still wraps to two rows and ends at 212. The stage there is 205px.

On a phone, the chips that do not fit are one swipe along the first-screen row. On the roots split those chips are T3, F3, and F2. On the lone diary they are T2 and F1. The caption carries the question those two chips name.

The chapter sentence on the phone roots picture starts at y=802. It is inside the footer, and Next no longer sits on it.

The set of c keeps one window on the roots split. A pinch zooms the basins. On the diary, a pinch zooms the index, and the Julia pane keeps its window.

The Julia colour at c = 0.26 still crowds. The sentence names that crowding. The bake was not changed.

L10 is a view on the playground station. It is not a new stop on the Story Map.

Pull request 17 was not merged.

READY

## PR #19 close review

Branch `cursor/playground-l11-twins-bfee`, pull request 19, base `gh-pages`. Head at kickoff `365f4eb`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **accept with fixes**. This pass does not merge and does not redeploy.

### Fixed

The twin and the copy were the jumps to the seahorse and the period-3 antenna. They were built into `#controls`, after the citation, the station links, and the headset line. At 1280×800 the footer’s first screen ended near y=799 and the chips started at y=1059. At 390×844 they started at y=1558. The questions, the badge, and the start of the citation were on the glass. The two chips were not.

They now sit under the two questions and above the badge. The footer still scrolls, and the row sticks to the top of that scroll, so the jumps stay on the glass while the citation moves. The chip whose c is on the picture is pressed. During a roll the two buttons disable with the rest of the controls. Leaving the picture removes the row.

### Decisions

The neighborhood window stays centred on c. A pinch on that pane shrinks the span and puts the centre back on the ring, so the picture stays the neighborhood of this c. The diary and the roots split still zoom toward the pointer and keep the ring in the middle 70%. Shift-drag on the diary pans and leaves c: an 90px shift-drag from c = 0 left the formula at c = 0. On the twins, drag and shift-drag both move c with the window. The spec names the shift-pan for the diary and the roots split. The twin hint says the drag pans the neighborhood and the Julia set follows, which is c moving.

The Julia pane has its own window. It opens at centre 0, span 2.6. Twelve wheels on the antenna, then one wheel on the Julia pane, still names the small copy, so the index span stayed under 0.16. The page does not call that Julia set the copy.

`settle()` in the assembler still returns Settles at c = 1/4, n = 50, period 1. The locked vector holds. The learner does not see that word as the verdict. The diary badge at c = 1/4 says on the cusp, fixed point 1/2, multiplier 1, the orbit approaches and does not leave, this is not Settles, a short watch is not Leaves. Enter on the station walk at the same c returns the parabolic sentence, the fixed point and the multiplier, and the same refusal of Settles and of Leaves. c = 0.2499 stays inside. c = 1/4 + 1e-9 stays Leaves.

The hint under the citation stays where the other pictures keep theirs. Moving it up would push the chapter sentence off the first screen. The copy badge, which is on that screen, says pinch in.

### The first screen, after the chips moved

At 1280×800 the stage is 248px, from under a 183px header to a 368px footer. Overlap with the footer is 0. Both panes are on the glass, with the labels. T1, T2, F1, and F2 are one row of full names, and the row does not overflow. The two questions are in the footer. The twin is pressed and sits at y=561–608, with The copy beside it. The badge and the chapter sentence follow. The chapter sentence starts at y=669.

At 390×844, on the antenna, the stage is 231px. Each pane is about half of that, and both labels fit. The header is Story Map, Theme, and Next. With no headset the XR button stays hidden. The thread row is T1, T2, F1, F2, overflow 0, and each accessible name is the full thread label. The twin and the copy sit at y=589–636. The copy is pressed. The antenna badge is fully in the footer. The chapter sentence starts at y=730.

The roots split at 390×844 puts T1, T2, T3, F3, and F2 on one row. The last chip ends at x=318. The row does not overflow. Each visible label is the id, and each accessible name is the full thread. The stage is 255px. Lower and Higher sit in the footer. The CPU bake of that split, and of the diary and the twins, still has ink.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c to the Julia set at that c. The page says the book does not number it.
- A small copy of the set of c found by zooming. Exercise 10 is the main cardioid. The page says the book does not number the copy.
- Carried forward: the set of c as an index that writes the Julia set back; coloured Newton basins; a higher power z^d + c for d greater than 2; no figure in the repo colours the basins of degree 4 or 5.

### Checked

`node tools/check_vectors.mjs` is 155/155. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the chips on the first screen, the five short ids, the small-copy pinch, the phone CPU loop, and the Julia loop without WebGL. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `5410ac2ceaaf4a1843f6d300f922188b02d16005d7e380d14d174996333d2a36`. `films/shared/hostclock.js` was not edited.

Screenshots: `/opt/cursor/artifacts/l11-twins-1280.png`, `/opt/cursor/artifacts/l11-twins-copy.png`, `/opt/cursor/artifacts/l11-twins-390.png`, `/opt/cursor/artifacts/playground-390-roots-cpu.png`, `/opt/cursor/artifacts/julia-loop-390-b.png`.

### Residue for mid and wide

The phone stage for the twins is 231px. The pictures are readable, and they are short. A wider badge row between 481px and the width of five full labels still scrolls. It was not shot at 700.

The gesture sentence for the twins still lives under the citation. The chips and the badge are the first-screen controls.

The Julia pane still opens on the whole set, span 2.6. That is the picture this pass left.

No headset was in the room. The standing line is still “No headset session. The shape stays in the void.”

L11 is a view on the playground station. It is not a new stop on the Story Map.

Pull request 19 was not merged.

## PR #19 mid review

Branch `cursor/playground-l11-twins-bfee`, pull request 19, base `gh-pages`. The close review stopped at `57acb28`. Zoom: site tie-in and Test 1 quality. Threads, Story Map doors, badges, footer links, citation honesty, and the way L11 sits beside L7–L10. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `5410ac2ceaaf4a1843f6d300f922188b02d16005d7e380d14d174996333d2a36`. Verdict: **accept with fixes**. This pass does not merge and does not redeploy.

### Where L11 sits

L10 is the set of c as an index. A touch writes a Julia set back across the void. L11 is the next picture: the neighborhood of one c, already beside the Julia set at that c. The standing caption, the two questions, and the citation say that. They do not call this picture the diary, and they do not call it a Newton basin.

L11 is a view on the playground station, the same way L7, L8, L9, and L10 are. The registry summary already names it in that sentence run. The station stays `threads: []`, and it stays off Next. A new Story Map stop would be a different kind of place from every level before it. The door back is the footer, and the header Story Map link still writes Test 1.

### Threads

T1 stays. c is one point, with two addresses.

T2 stays. The square is the multiply turn, and the footer opens Powers.

F1 stays. The colour is the fate of the orbit of 0. The footer opens that orbit.

F2 stays. Twins is two panes. The other pane is square, then slide. The lone diary still leaves F2 off. A lone picture does not wear it.

F3 stays on the roots picture. The colour there is which root the walk finds. Twins does not wear it. T3 stays off. This picture is not the derivative.

### The badge row

Above 480px the chips wrap inside the caption’s measure, the way a Test 1 lede wraps. A sideways scroll at a tablet width was hiding the last labels, and on the roots split those labels are F3 and F2, the Chapter 4 join the split is there to show.

At 700×900 the five full labels are two rows. T1, T2, and T3 sit at y=156. F3 and F2 sit at y=211. Overflow is 0. The stage is 255px. Overlap with the footer is 0. Twins at the same width wraps F2 onto a second row. The stage there is 279px. The twin and the copy sit at y=650–697, and the chapter sentence starts inside the footer.

Under 480px the row stays one line of short ids. The accessible name is still the full thread. On the roots split at 390 the five ids fit, overflow is 0, and each chip is inside the row. The fade is only for a phone row that still overflows.

At 1280×800 the twins row is one line of full names, the same as close. The stage is 248px. The twin sits at y=561–608.

### The phone stage

At 390×844, on the antenna, the stage is 202px. The header is 268px: the kicker, a caption 46px tall, Story Map / Theme / Next, and one badge row 49px tall. The footer is 374px, which is the cap. Overlap is 0. The twin and the copy are on the glass, and the chapter sentence starts inside the footer. Each pane is about half of 202. The phone is one ribbon wide, so the two panes stack. That band is the honest chrome. Taking height from the footer would move the chips close just put on the glass. Left as it is.

### The standing words

The caption leads with the neighborhood beside the Julia set. The kicker still says L11 · twins.

The second question on the standing picture is “What Julia set sits beside this c?” The diary keeps “What Julia set does this c write back?” A flash still uses the write-back question, because that roll is the write-back.

The opening badge puts “the book does not number this resemblance” on the resemblance, and Theorem 4.2.11 on the one-piece sentence. Exercise 10 stays the main cardioid.

The antenna badge says pinch in. It does not yet say the book does not number the copy. After a pinch under span 0.16, the badge and the citation both name the small copy, say the Julia pane is not that copy, and say the book does not number it.

The gesture sentence stays under the citation. It is short sentences: the ring, the drag, which pane is the Julia set, the pinch on the neighborhood, the two chips, the arrow keys, and Enter. It does not name the small copy.

The Mandelbrot door on twins says this neighborhood is one place in the set of c. The Julia door says the other pane is the Julia set beside the neighborhood. The other doors are the ones the diary already earned: Story Map, Powers, the orbit of 0, the disk, the cardioid. Newton stays on the roots picture.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c to the Julia set at that c. The page says the book does not number it.
- A small copy of the set of c found by zooming. The page says so after the pinch under 0.16. Exercise 10 is the main cardioid.
- Carried forward: the set of c as an index that writes the Julia set back; coloured Newton basins; a higher power z^d + c for d greater than 2; no figure in the repo colours the basins of degree 4 or 5.

### Checked

`node tools/check_vectors.mjs` is 155/155. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the neighborhood question, F2 on twins and off the lone diary, the small-copy sentence only after the pinch, the five full labels wrapping at 700, and the five short ids on the phone. `node kit/smoke.mjs` exits 0. `#home-t2` still forces test 1.

Headless Chrome at 1280×800, 700×900, and 390×844. Twins, the antenna, the pinch, and the roots split. No sideways page scroll. Overlap of the stage into the footer is 0.

Screenshots: `/opt/cursor/artifacts/l11-twins-1280.png`, `/opt/cursor/artifacts/l11-twins-390.png`, `/opt/cursor/artifacts/l11-twins-copy.png`, `/opt/cursor/artifacts/mid-badges-700.png`, `/opt/cursor/artifacts/playground-390-roots-cpu.png`.

### For the wide reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.” `films/shared/hostclock.js` was not edited.

A tap, or Enter, still rolls that c’s Julia set with the diary’s roll. The standing picture does not teach itself as that flash. The flash caption still says the colour is how fast the walk leaves.

The phone stage is 202px. The panes are short. The chips and the chapter sentence are on the glass.

Above 480px the badges wrap. At 700 the roots split is two rows and the stage is 255px. Under 480px the ids are one row.

The Julia pane still opens at centre 0, span 2.6.

`settle()` in the assembler still returns Settles at c = 1/4. The diary badge and the station walk still say parabolic.

L11 is a view on the playground station. It is not a new stop on the Story Map.

Pull request 19 was not merged.

## PR #19 wide review

Branch `cursor/playground-l11-twins-bfee`, pull request 19, base `gh-pages`. The mid review stopped at `612a696`. The gesture change is `df32993`. Zoom: what this page makes the learner notice. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `5410ac2ceaaf4a1843f6d300f922188b02d16005d7e380d14d174996333d2a36`. `films/shared/hostclock.js` was not edited. Verdict: **READY**. This pass does not merge and does not redeploy.

### What the learner is asked to see

L10 is the index. A touch writes a Julia set back across the void, and the colour on that flash is how fast the walk leaves.

L11 is the next picture, and it is a different question. The neighborhood of one c is already beside the Julia set at that c. The seahorse opening is that pair. The first ask under the picture is “What Julia set sits beside this c?” The bounded question stays underneath it, because the left pane is still the set of c. The diary keeps its own order: the index question, then the write-back.

A pinch along the period-3 antenna is the second beat. The chip lands at span 0.48 and the badge says pinch in. Under span 0.16 the badge and the citation name a small copy of the set of c, and they say the Julia pane is the Julia set at that centre.

### The five questions

The first screen asks before it offers a control. The caption names the resemblance and the orange ring. The picture is the two panes. The first line in the footer is the beside question, then the bounded question, then The twin and The copy. The opening badge points at the other pane and puts Theorem 4.2.11 on the one-piece sentence. The resemblance stays unnumbered. The citation, the doors, and the gesture sentence sit under that.

Twins is not a second skin of the diary. A tap, Enter, or Space stays with the two panes. The ring does not jump, and the stage does not roll a Julia set over both of them. The diary is still where a touch, or Enter, writes the marked c back. The hint on twins says so, in one line, under the citation. `writes` counts that diary roll only. A twins tap does not add one.

The seahorse stays on the glass. The roll that used to cover it was the diary’s 2.4 s write-back, and on this picture that roll was a second copy of a set the other pane was already showing. Drag still moves c with the neighborhood, and the Julia pane follows. Letting go leaves that picture. The assembler is unchanged, so the bake stays the deterministic one.

The cusp is told as mathematics on the station walk and on the diary. At c = 1/4 the badge says on the cusp, fixed point 1/2, multiplier 1, the orbit approaches and does not leave, this is not Settles, and a short watch is not Leaves. Exercise 8 is the real c past 1/4. The assembler cell still returns Settles there, for the locked vector. The learner does not see that word as the verdict. The small-copy sentence waits for the pinch. At span 0.48 the badge says a small cardioid appears if you pinch in, and it says the Julia pane is the set at this centre. The chip is named The copy because that is the thing the pinch finds. The sentence that names it waits until the span is under 0.16, and it says the book does not number it.

The badges are the threads the picture earns: T1, T2, F1, and F2 on twins. They open the Story Map on that thread. The doors under the citation are Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and the cardioid. The Julia door says the other pane is the Julia set beside this neighborhood. The Mandelbrot door says this neighborhood is one place in the set of c. F2 stays off the lone diary. F3 stays on the roots picture.

### Fixed

A tap on either pane, a drag let go, Enter, and Space used to roll that c’s Julia set with the diary’s roll and switch the ask to the write-back question. The standing picture is that set, already beside the neighborhood. Those gestures stay with the two panes. The diary’s roll is unchanged, including the flash caption that the colour is how fast the walk leaves.

The standing ask puts “What Julia set sits beside this c?” first. The opening badge names the other pane, and it keeps the unnumbered resemblance beside Theorem 4.2.11.

### Decisions

The Julia pane still opens at centre 0, span 2.6. The resemblance is the neighborhood beside the whole set at that c. A tighter Julia window would be a different picture.

The phone stage stays 202px. The panes are short. Taking height from the footer would move the chips and the chapter sentence off the glass.

The copy chip still jumps to span 0.48. The small-copy sentence still waits for the pinch under 0.16. Naming the copy in the badge before the cardioid is on the glass would tell the learner they had already found it.

L11 stays a view on the playground station, `threads: []`, off Next. A Story Map stop would be a different kind of place from L7 through L10.

No headset was in the room. The standing line stays “No headset session. The shape stays in the void.”

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c to the Julia set at that c. The page says the book does not number it.
- A small copy of the set of c found by zooming. The page says so after the pinch under 0.16. Exercise 10 is the main cardioid.
- Carried forward: the set of c as an index that writes the Julia set back; coloured Newton basins; a higher power z^d + c for d greater than 2; no figure in the repo colours the basins of degree 4 or 5.

### Checked

`node tools/check_vectors.mjs` is 155/155. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including Enter on the diary still writing the Julia set back, and a tap or Enter on the twins leaving the beside question in place with no flash. `node kit/smoke.mjs` exits 0. `#home-t2` still forces test 1.

Headless Chrome at 1280×800, 700×900, and 390×844. The twins stage is 248px at 1280 and 202px at 390. Overlap with the footer is 0. At 700 the twin chips stay on the glass and F2 wraps onto a second row. The roots split at 700 is still two rows of full labels, stage 255px.

Screenshots: `/opt/cursor/artifacts/l11-twins-1280.png`, `/opt/cursor/artifacts/l11-twins-390.png`, `/opt/cursor/artifacts/l11-twins-copy.png`.

### Residue

The phone panes are short on purpose. The chips and the chapter sentence stay on the glass.

The Julia pane still opens at centre 0, span 2.6.

`settle()` in the assembler still returns Settles at c = 1/4, n = 50, period 1. The station walk and the diary badge say parabolic.

No headset was used. `films/shared/hostclock.js` was not edited.

L11 is a view on the playground station. It is not a new stop on the Story Map.

Pull request 19 was not merged.

READY

## PR #20 close review

Branch `cursor/playground-l12-bulbs-b711`, pull request 20, base `gh-pages`. Head at kickoff `289b41b`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **accept with fixes**. This pass does not merge and does not redeploy.

### Fixed

The thread badges were on the glass and did not take a tap. The header passes pointer events through so a lone picture can be dragged under the type. Story Map, Theme, and Next opt back in. The badges never did. On twins and on bulbs, at 390 and at 1280, a hit in the middle of T1, T2, F1, or F2 landed on the star canvas. The link was in the tab order and nowhere a finger could press. The badge now takes the event. The row around it still passes through. Each badge is the full 2.75rem tap, and the hit is the link.

A live session renames the header button to “Leave session”. On the phone that word wrapped inside the button, the whole action row grew from 38px to 48px, and the header grew from 145px to 155px. The labels now stay one line. The kicker does not shrink. The actions stay `min-height: 2.25rem` (38px at this root) and each one still receives the tap. With the session label showing, the kicker ends at x=99 and Story Map starts at x=111. Leave session ends at x=378 inside the 390px viewport. Nothing scrolls sideways. The stage stays 325px instead of giving 10px back to a wrapped label.

### The first screen

At 390×844, twins and bulbs, with or without the session label: header 145px, stage 325px, footer 374px. The panes are side by side, 195px and 195px. Overlap of the stage into the footer is 0. The caption is on the glass. T1, T2, F1, and F2 are one row of short ids, overflow 0, and each one takes the tap. The two questions, the chips, and “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” start inside the footer. The twin and the copy are 47px and fully on that glass. Period 1, Period 2, and Period 3 are the same. Header actions are 38px. Footer chips stay 47px.

At 1280×800 the twins stage is 248px, under a 183px header, above a 368px footer. The bulbs stage is 280px, under a 151px header. Overlap is 0 on both. The four thread names are one row and each takes the tap. Header actions are the full 47px tap, because the 2.25rem cut is only the phone rule. The chips and the chapter sentence are on the glass.

At 700×900 the twins chips stay on the glass (y=650–697), F2 wraps onto a second row, overflow is 0, and the stage is 279px. That width is the mid review’s. This pass did not restack it.

### Checked and left as is

`settle()` at c = 1/4 with a real quadratic start returns Parabolic, period 1: n = 56 for z0 = 0, n = 50 for z0 = 0.4, n = 56 for z0 = 0.2. c = 0.2499 still Settles (n = 54, period 1). The basilica still Settles in `settle()` (n = 180, period 2 from z0 = 0). `attractingCycle` at c = −0.75 returns the parabolic fixed point −1/2, period 1, multiplier −1. That is the root of the period-2 bulb, and the bulbs badge already says so. The critical orbit is still walking in: after 400 steps it sits near −0.464, about 0.034 from −1/2. The screen disk closes before that landing, which is why `settle()` says Settles and the station walk still says the basilica settles. This pass does not rename that cell.

The Julia pane on twins opens at centre 0, span 2.6, and `syncTwinJulia` writes that centre back on every neighborhood zoom. The span stays 2.6 while the Mandelbrot span is at least the seahorse 0.045. The copy chip is span 0.48. Twelve wheels from there land near span 0.06, which is under 0.16, so the small-copy sentence appears, and still at least 0.045, so the Julia pane stays 2.6. A pinch on the Julia pane zooms that pane only. Bulbs does not follow: the Julia window is fixed at centre 0, span 2.6, and a pinch of the set of c left the same number of inked samples on the right half. The colour checksum can still shift, because the shared iteration budget follows the Mandelbrot span. The cycle stays in frame.

L12’s three period chips are on the glass and take the tap. The cycle paints on the GPU and on the CPU (`dataset.draws` increases while the picture is up). A tap, Enter, or Space leaves the diary flash empty. Reduced motion holds the overlay still. The GPU shader still draws a ring under the overlay ring on the set of c. It sits on the marked bulb, it does not cover a chip or the period badge, and the numerals stay readable. Left for mid and wide.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited. L11 and L12 stay playground views, off Next and off the Story Map.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c near a point to the Julia set at that c.
- A small copy of the set of c found by zooming (the period-3 antenna). Exercise 10 is the main cardioid.
- The set of c as an index that writes the Julia set back.
- Coloured Newton basins.
- A higher power z^d + c for d greater than 2, and a figure that colours the basins for degree 4 or 5.
- The rotation-number ordering of the bulbs around the cardioid.
- The period-doubling cascade along the real axis, beyond the bulbs Figure 4.2.13 draws.

### Checked

`node tools/check_vectors.mjs` is 175/175. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the new check that the four phone thread badges and the header actions take the tap, and that those actions stay between 36px and 44px while the session label is showing. The phone box it logged is stage 325, header 145, footer 374. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `7935f73c0a5cf77777180c5f4ec302273b66361360f84c1d8c88d5c573419322`.

Screenshots: `/opt/cursor/artifacts/close-l11-twins-390.png`, `/opt/cursor/artifacts/close-l11-twins-390-leave.png`, `/opt/cursor/artifacts/close-l11-twins-1280.png`, `/opt/cursor/artifacts/close-l12-bulbs-390.png`, `/opt/cursor/artifacts/close-l12-bulbs-1280.png`, `/opt/cursor/artifacts/l12-bulbs-390-cpu.png`.

### Residue for mid and wide

The phone header actions are 38px, which is the 2.25rem this batch chose so four labels fit beside the kicker. The footer chips and the thread badges stay 47px. A wider system font than this Chrome could still crowd Leave session against the right padding. It fits here with the button ending at x=378.

The GPU ring under the overlay ring on bulbs is still there. It does not eat a control.

A pinch of the set of c on bulbs can shift the Julia colouring, because the iteration budget follows that span. The window stays centre 0, span 2.6.

At 700 the thread names wrap, and the header actions sit under the caption. The stage there is 279px for twins. The chips stay on the glass.

No headset was in the room. The standing line is still “No headset session. The shape stays in the void.”

`settle()` still says Settles for the basilica. The bulbs badge at c = −0.75 says parabolic. Both are the readings this pass confirmed.

L11 and L12 are views on the playground station. They are not stops on the Story Map.

Pull request 20 was not merged.

## PR #20 mid review

Branch `cursor/playground-l12-bulbs-b711`, pull request 20, base `gh-pages`. The close review stopped at `358dcea`. Zoom: site tie-in and Test 1 quality. Threads, Story Map doors, badges, footer links, citation honesty, and the way L11 and L12 sit beside L7–L10. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `7935f73c0a5cf77777180c5f4ec302273b66361360f84c1d8c88d5c573419322`. Verdict: **accept with fixes**. This pass does not merge and does not redeploy.

### Where L11 and L12 sit

L10 is the index. A touch writes a Julia set back. L11 is the neighborhood of one c, already beside the Julia set at that c. PR #19 mid locked that voice. It still holds: the beside question comes first, the caption names the resemblance, F2 is the other pane, and the small-copy sentence waits for the pinch.

L12 is the next picture, and it is a different question. A bulb has a period. That period is the orbit of 0, and those places light on the Julia pane, in turn. The Story Map already has this lesson as The Cardioid and the Period: Theorem 4.2.20, period read from the orbit of 0, presets at c = 0 and c = −1. L12 is that stop with the cycle on the glass. It is not a second diary.

L11 and L12 stay views on the playground station, the same way L7 through L10 do. The registry stays `threads: []`. Neither view is a Next stop. A new Story Map stop would put the unnumbered rotation-number order, and the unnumbered cascade, on Next. The map’s period stop is already there. The door back is the footer.

### Threads

T1 stays. c is one point, with two addresses.

T2 stays. The square is the multiply turn. The footer opens Powers. The accessible names on the period chips are the cardioid stop’s presets: Period 1 is c = 0, Period 2 is c = −1.

F1 stays. The colour on the left is the fate of the orbit of 0. The places that light are that orbit, once it has a cycle. The footer opens The Orbit of 0.

F2 stays. Bulbs is two panes. The right pane is square, then slide, and the cycle lights there. A lone picture still does not wear F2. The lone diary is unchanged.

F3 stays on the roots picture. T3 stays off. Theorem 4.2.20 is a derivative test, and the cardioid stop’s earlier card already names the derivative. This picture’s gesture is the bulb and the cycle, not the derivative. A fifth badge would be a costume, and it would spend the header row close just fitted.

The four badges take the tap. Close opted them back in. This pass left that hit target alone.

### Doors

Story Map writes Test 1. A T badge writes Test 1. An F badge writes Test 2, which those routes already force.

On bulbs the row is Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and The Cardioid and the Period. Newton stays on the roots picture.

The cardioid door now names the stop. Theorem 4.2.20 is period 1. That stop reads the period from the orbit of 0, the same orbit whose places light here. Exercise 10 draws the body. On twins and on the diary the same door stays “Exercise 10. The main cardioid.” Those pictures are not the period lesson.

The orbit door, on bulbs, says the period is this orbit and the places that light are the cycle it falls into.

The disk door, on bulbs, says Period 1 is c = 0, and Exercise 4 is the closed unit disk at that c. The cardioid and the disk are two stops. The chip is one point in both.

The Julia door says the cycle of this c lights on the other pane. The Mandelbrot door says a bulb is one piece of the set of c.

### The standing words

The bulbs caption used to open with “Touch a bulb,” the diary’s gesture. The diary is where a touch writes a set back. This picture already has the Julia set in the other pane. The caption now leads with the period: “The period of this bulb is the orbit of 0. Those places light in turn.” The phone header stays 145px, so the line is still two lines. The stage stays 325px.

The first question stays “What period is this bulb?” The formula under it is the orbit of 0, the same walk as the bounded question underneath. The two questions are different. The walk is the same one. Twins keeps “What Julia set sits beside this c?” first. A tap, Enter, or Space stays with the period. The hint says the diary is where a touch writes a set back.

The three chips stay Period 1, Period 2, and Period 3. They are the Test 1 pill: full 2.75rem tap, the pressed one heavier, with the inset ring. The tint stays the orange of this c, which is the ring on the picture. The cardioid stop’s chips are c = 0 and c = −1. Those addresses are the accessible names here. The visible labels stay the periods, because the period is the lesson.

The opening badge is still the numbered one. Period 3, three places, Theorem 4.2.20 is period 1, Figure 4.2.13 draws the bulbs. The unnumbered claims are not in that sentence.

They are in the sentences that make them. On the real doubling, at period 4 or 8, the badge names 1, then 2, then 4, then 8, and says the book does not number that cascade. On the period-5 bulb between period 2 and period 3, the badge says the book does not number that ordering. The citation says both, as it did.

Period 1 uses the cardioid stop’s sentence: a fixed point attracts, and that is the main cardioid of Theorem 4.2.20. At c = 1/4 and at c = −0.75 the badge says the fixed point does not attract, so this c is not inside that cardioid. c = −0.75 adds that it is the root of the period-2 bulb, and that this is not Settles. Period 0 uses the stop’s dust sentence, with Theorem 4.2.11.

Definitions 4.2.17 and 4.2.18 are a link, to the same anchor the theorem already uses. The words were already on the page.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c near a point to the Julia set at that c.
- A small copy of the set of c found by zooming (the period-3 antenna). Exercise 10 is the main cardioid.
- The set of c as an index that writes the Julia set back.
- Coloured Newton basins.
- A higher power z^d + c for d greater than 2, and a figure that colours the basins for degree 4 or 5.
- The rotation-number ordering of the bulbs around the cardioid.
- The period-doubling cascade along the real axis, beyond the bulbs Figure 4.2.13 draws.

### Checked

`node tools/check_vectors.mjs` is 175/175. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the period caption, the orbit formula under that question, F2 on bulbs and off a lone index, the cardioid door naming Theorem 4.2.20, the four phone badges taking the tap, and Enter on a period chip leaving the diary flash empty. `node kit/smoke.mjs` exits 0. `#home-t2` still forces test 1.

Headless Chrome. Twins at 1280: stage 248px. Twins at 390×844: header 145px, stage 325px, footer 374px, side by side, citeStarts, overlap 0. Twins at 700: F2 on a second row, stage 279px, chips on the glass. Bulbs at 390×844: header 145px, stage 325px, footer 374px, side by side, citeStarts, overlap 0, Period 3 pressed. Bulbs at 1280: header 151px, stage 280px, footer 368px, four full thread names, citeStarts, overlap 0.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l11-twins-1280.png`, `/opt/cursor/artifacts/l11-twins-390.png`, `/opt/cursor/artifacts/l12-bulbs-1280.png`, `/opt/cursor/artifacts/l12-bulbs-390.png`.

### For the wide reviewer

A headset was not in the room. The standing line is still “No headset session. The shape stays in the void.”

The GPU shader still draws a ring under the overlay ring on the marked bulb. It does not cover a chip or the period badge.

A pinch of the set of c can shift the Julia colouring, because the shared iteration budget follows that span. The window stays centre 0, span 2.6. Bulbs does not follow the neighborhood zoom. Twins still tightens only after the Mandelbrot span drops below 0.045, and the centre stays 0.

Phone header actions are 38px, so four labels fit beside the kicker, including Leave session on one line. Footer chips and thread badges stay 47px. A wider system font than this Chrome could still crowd Leave session.

At 700 the thread names wrap. The twins stage there is 279px. The chips stay on the glass.

`settle()` still says Settles for the basilica. The bulbs badge at c = −0.75 says parabolic, and it says the fixed point does not attract. Both readings stay. The assembler cell was not renamed.

L11 and L12 are views on the playground station. They are not stops on the Story Map, and they are not Next.

Pull request 20 was not merged.

## PR #20 wide review

Branch `cursor/playground-l12-bulbs-b711`, pull request 20, base `gh-pages`. The mid review stopped at `4a9fc25`. Zoom: what this page makes the learner notice. The code change is `1cbc984`. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `7935f73c0a5cf77777180c5f4ec302273b66361360f84c1d8c88d5c573419322`. `films/shared/hostclock.js` and `js/core/anim.js` were not edited. Verdict: **READY**. This pass does not merge and does not redeploy.

### What the learner is asked to see

L10 writes a Julia set back. L11 puts one neighborhood beside the Julia set at that c. L12 asks a different question: what period is this bulb? The period is the orbit of 0, and those places light on the Julia pane, one at a time. The opening is the period-3 bulb, so three places are already there. The first line under the picture is that question. The bounded question stays underneath it, because the left pane is still the set of c, and the walk is the same one. The chips are Period 1, Period 2, and Period 3. They are not The twin and The copy, and a tap does not roll the diary.

### The five questions

The first screen asks the period before it offers a control. The caption names the orbit of 0 and the places that light. The picture is the two panes. On the Julia pane the place that is on is orange, the same mark as the ring, and the places that are waiting stay green. Before this pass the waiting places were drawn at alpha 0.2, and on the rabbit they disappeared. The page then read as another fractal with a shy dot. They are opaque now. The turn is still the diary’s 2.4 s, on the one paint clock. Reduced motion holds every place steady, in that orange, and does not turn.

The two formulas match on purpose. Twins puts a different formula under each question, because the beside question is the Julia map and the bounded question is the orbit of 0. Here both questions are that orbit. The period is read from it. Splitting the TeX would have invented a second walk.

Bulbs is not a third skin of the diary. The diary’s gesture is a touch that writes a set back across the void. Twins is a neighborhood already beside its Julia set. Bulbs is the period of one bulb, and the cycle is on the glass. The hint still says the diary is where a touch writes a set back. Enter and Space stay with the period.

The numerals on the set of c are the periods. The opening badge says so. Period 1, 2, and 3 are the chips. The real row, once you are on period 4 or 8, says the periods double, 1 then 2 then 4 then 8, that those numerals mark that row, and that the book does not number the cascade. The period-5 bulb says the numeral 5 sits between 2 and 3, and that the book does not number that ordering. No fraction was added. The assembler is unchanged, so the bake stays the deterministic one.

At c = 1/4 the badge says parabolic, fixed point 1/2, multiplier 1, the orbit approaches and does not fall in, a closed disk is the iteration limit, so this is not Settles, and the fixed point does not attract, so this c is not inside the cardioid of Theorem 4.2.20. Exercise 8. That is the station’s sentence, plus the theorem this picture is for.

At c = −0.75 the cardioid stop and `settle()` say Settles, period 2, n = 180. The critical orbit is alternating and still walking into the parabolic point −1/2, multiplier −1. A screen disk closes on the two places before they land. The badge says that. It names the root of the period-2 bulb. It does not call the landing Settles, and it does not pretend the station’s disk was a bug. The assembler cell was not renamed. c = −1 still Settles, period 2, n = 19. That is a different point.

The door row is under the citation. On a 1280×800 window the cardioid door starts at y = 1006 and the footer ends at 799. A learner who stays on the first screen never reached “The Cardioid and the Period.” The opening badge now names that stop, and the name is the link. Period 1 and period 2 name it too. The door under the citation still says Theorem 4.2.20 is period 1 and that the stop reads the period from this same orbit. The row teaches once you scroll. The sentence teaches on the glass.

### Fixed

The waiting places of the cycle were too faint to see on the Julia set. The lit place is orange. The waiting places stay green, at alpha 0.92. The clock and the 2.4 s roll are the ones mid locked.

The GPU bake drew a ring under the overlay ring. The CPU bake already skipped it. Bulbs now bakes as diary mode 4, side by side, with no ring in the shader. A sample on the radius of that old ring, on the fractal canvas, was interior colour, 0 orange pixels of 24. Diary and twins still mark c in the bake. The overlay ring is the one ring, and it sits with the numerals.

The opening badge names the numerals as the periods and links The Cardioid and the Period. The period-5 badge points at the numeral between 2 and 3. The cascade badge points at the numerals on the real row. Both still say the book does not number the claim. The cusp badge and the period-2 root badge say the mathematics of the landing, including why a screen disk at c = −0.75 says Settles.

### Decisions

The bounded question stays, under the period question, with the same orbit. The left pane is still which c keep the walk from 0 bounded.

The door row stays under the citation. Pulling seven doors above the chapter sentence would have pushed that sentence off the phone glass. The link in the badge is the first-screen door.

L11 and L12 stay views on the playground station, `threads: []`, off Next. A Story Map stop would put the unnumbered order, and the unnumbered cascade, on Next. The map’s period stop is The Cardioid and the Period. The badge points at it.

No headset was in the room. The standing line stays “No headset session. The shape stays in the void.”

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- The local resemblance of the set of c near a point to the Julia set at that c.
- A small copy of the set of c found by zooming (the period-3 antenna). Exercise 10 is the main cardioid.
- The set of c as an index that writes the Julia set back.
- Coloured Newton basins.
- A higher power z^d + c for d greater than 2, and a figure that colours the basins for degree 4 or 5.
- The rotation-number ordering of the bulbs around the cardioid.
- The period-doubling cascade along the real axis, beyond the bulbs Figure 4.2.13 draws.

### Checked

`node tools/check_vectors.mjs` is 175/175. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the period caption, the orbit under that question, the chapter sentence on the phone glass, and Enter on a period chip leaving the diary flash empty. `node kit/smoke.mjs` exits 0.

Headless Chrome. Bulbs at 1280: header 151px, stage 280px, footer 368px, overlap 0, citeStarts, four full thread names. The opening badge is on that glass, two lines, and the stop link is in it. Bulbs at 390×844: header 145px, stage 325px, footer 374px, overlap 0, citeStarts. The badge is three lines and still above the chapter sentence. Header actions are 38px. Twins at 1280: stage 248px. Twins at 390: header 145px, stage 325px, footer 374px, overlap 0. At 700 the twin chips stay on the glass, F2 wraps, and the stage is 279px.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l11-twins-1280.png`, `/opt/cursor/artifacts/l11-twins-390.png`, `/opt/cursor/artifacts/l12-bulbs-1280.png`, `/opt/cursor/artifacts/l12-bulbs-390.png`.

### Residue

A pinch of the set of c can still shift the Julia colouring, because the shared iteration budget follows that span. The window stays centre 0, span 2.6. The cycle stays in the frame. Bulbs does not follow the neighborhood zoom.

Phone header actions are 38px, so four labels fit beside the kicker. Footer chips and thread badges stay 47px. A wider system font than this Chrome could still crowd Leave session.

At 700 the thread names wrap. The twins stage there is 279px. The chips stay on the glass.

`settle()` still says Settles at c = −0.75 (period 2, n = 180) and at c = −1 (period 2, n = 19). The bulbs badge at c = −0.75 says the screen disk closed before the parabolic landing. The assembler cell was not renamed. `settle()` at c = 1/4 stays Parabolic.

The door row is still under the citation. The badge link is the door on the first screen.

No headset was used.

L11 and L12 are views on the playground station. They are not stops on the Story Map, and they are not Next.

Pull request 20 was not merged.

Vectors 175/175. Assembler sha256 `7935f73c0a5cf77777180c5f4ec302273b66361360f84c1d8c88d5c573419322`.

READY

## PR #21 close review

Branch `cursor/playground-l13-cascade-25d7`, pull request 21, base `gh-pages`. Head at kickoff `627fe1b`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **accept with fixes**. This pass does not merge and does not redeploy. The assembler was not edited. `films/shared/hostclock.js` was not edited.

### Fixed

On a phone the four cascade chips wrapped. "Period 2" and "Period 4" broke after the word, and "Pile-up" can break at the hyphen, so the row grew to 58px and the label was no longer one tap. The row now keeps each label on one line, 44px tall. At 390 the four sit inside the viewport (Pile-up ends at x=378), the row does not scroll, and a hit in the middle of each chip is the button. At 360 they still fit, still 44px, still no sideways scroll.

The cascade hint began with "Tap the void. That point’s shape writes itself, then the stars return." Twins and bulbs already skip that sentence. Cascade did not, so the instruction told the learner to flash a shape this picture does not flash. The hint is now only the cascade line: drag the real line, pinch does not zoom, a tap or Enter or Space stays with this picture.

### The first screen

At 390×844, opening at c = −1, no session label: header 144px, stage 326px, footer 374px. The panes are side by side. Overlap of the stage into the header or the footer is 0. Nothing scrolls sideways. Story Map, Theme, and Next are 44px and each takes the tap. Next ends at x=378. T1, T2, F1, and F2 are one row of short ids, each 47px, each takes the tap. The four chips and "Test 1 is Chapters 1 to 3. Test 2 is Chapter 4." start on the glass. The chapter sentence starts at y=727. The door row starts below the footer’s visible bottom. It does not cover a chip or the stage, so it stays where the builder put it.

With Leave session showing, the same phone: the kicker takes its own row and the four actions sit under it. They do not overlap the kicker. Each action is 44px, each takes the tap, and Leave session ends at x=378. Header 162px, stage 307px, overlap 0. That is the height the builder reported, and the smoke run measured the same box.

At 1280×800: header 183px, stage 248px, footer 368px, overlap 0, layout split. The four chips are one line and take the tap. The four thread names are one row and take the tap. Header actions are the full 47px tap. The chapter sentence starts on the glass. The door row starts below y=800. Pulling seven doors above the citation would push that sentence off the phone glass, which is why it stays under the citation.

### Checked and left as is

Dragging the left pane, and the four chips, walk the real line: cardioid (period 1 at c = 0), period 2 at c = −1, period 4, period 8, then the pile-up near c = −1.4012. The pressed chip matches. The Julia window stays centre 0, span 2.6. A wheel on either pane, and +, leave that span and the Julia iteration count alone. A tap on the Julia pane, Enter, and Space leave the diary flash empty.

A pinch of the bulbs index left the Julia interior hash unchanged (3,360,009,436 over 58,368 pixels) while the index iteration count went from 219 to 347. The Julia window and its iteration count stayed 2.6 and 531.

`settle()` at c = −0.75 is Parabolic, period 1, from z0 = 0 (n = 180) and from z0 = 0.4 (n = 132), including a wide radius (n = 10). A start on the repeller 3/2 still Settles, period 1. c = −1 is Settles, period 2 (n = 19), including that wide radius. c = 1/4 is Parabolic, period 1 (n = 56 from z0 = 0 and from z0 = 0.2). The station walk `orbitUntil` still says Settles, period 2, for c = −0.75. That is the screen disk the badge already names. This pass did not rename it.

`data-xr-proof` is `untried`. With no session the line is "No headset session. The shape stays in the void. A headset was not used to check this page." A stubbed session that never draws still says a headset was not used. L11, L12, and L13 stay off the Story Map and off site Next.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The cascade and the accumulation near c = −1.4012 have no book number.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10].
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0.
- Not numbered: local resemblance, small copies, the rotation-number order, the period-doubling cascade, and the accumulation near c = −1.4012.

### Checked

`node tools/check_vectors.mjs` is 186/186. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the one-line chips, the header actions at 44px while Leave session is showing, and the hint that does not say to tap the void. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`.

Screenshots: `/opt/cursor/artifacts/close-l13-cascade-390.png`, `/opt/cursor/artifacts/close-l13-cascade-1280.png`.

### Residue for mid and wide

At 1280 the stage is 248px under a 183px header. The caption is two lines and the four thread names take a row. The panes are side by side and nothing covers them. The footer is the tall part of that window.

The door row is under the citation, on the phone and at 1280. The opening badge names Theorem 4.2.20 and does not link The Cardioid and the Period. L12 put that link in the badge because the door was below the fold. This pass left the doors where they are. They do not cover a chip or the stage.

With Leave session, the phone header wraps and the stage is 307px. The actions stay 44px and on the glass.

The station walk still says Settles, period 2, at c = −0.75. `settle()` says Parabolic, period 1. Both readings are the ones this pass confirmed.

No headset was in the room.

L11, L12, and L13 are views on the playground station. They are not stops on the Story Map, and they are not Next.

Pull request 21 was not merged.

## PR #21 mid review

Branch `cursor/playground-l13-cascade-25d7`, pull request 21, base `gh-pages`. Head at kickoff `12654f7`. Zoom: site tie-in and Test 1 quality. Does the cascade feel like the rest of One Point, Two Addresses? Verdict: **accept with fixes**. This pass does not merge and does not redeploy. The assembler was not edited. `films/shared/hostclock.js` was not edited.

### Fixed

The desktop header was 183px because the caption wrapped to a second line. Bulbs, with the same four full thread names, is 151px. The cascade caption is now one line at 1280: “The real orbit of 0 splits. Those places light on the Julia set.” The header is 151px and the stage is 280px, the bulbs chrome. On a phone the same sentence is still two lines. At 390×844 with no session the header is 144px and the stage is 326px, the close measurement. With Leave session showing, the header is 162px and the stage is 307px, also the close measurement. The phone stage was not shortened.

The opening badge names The Cardioid and the Period, and the name is the link to `index.html#bulbs`. Period 1, the other period-2 sentence, the real doubling at period 4, 8, and 16, and both parabolic landings name that stop too. Theorem 4.2.20 is period 1. The sentence that names the cascade still says the book does not number it.

The station walk said Settles, period 2, at c = −0.75. `settle()` says Parabolic, period 1. The screen disk was closing on the two places while they were still walking into the fixed point −1/2, multiplier −1. That is not an attracting 2-cycle. `orbitUntil` now returns parabolic, period 1, for that root: the critical orbit, a real start at 0.4, a complex start, and the point −1/2 itself. The cardioid stop’s c = −0.75 chip reads that sentence, and the period line agrees: the fixed point does not attract, so this c is not inside the main cardioid. The bulbs badge no longer says “settle() reports”. c = −1 still Settles, period 2, multiplier 0. The screen-overlap lesson moved to c = −0.751, an attracting 2-cycle just inside the bulb, where the places really are two and a zoom separates them.

### Decisions

The door row stays under the citation. At 1280 it starts at y = 932, and at 390 at y = 1123. Pulling seven doors above the chapter sentence would push “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” off the phone glass. The link in the badge is the first-screen door, the same choice L12 made.

L11, L12, and L13 stay views on the playground station, off the Story Map and off site Next. Theorem 4.2.20 already has a stop, The Cardioid and the Period, and Figure 4.2.13 is the bulbs on that stop. The book does not number the cascade or the accumulation near c = −1.4012. A new map stop would invent that number. Playground Next stays the assembler’s `advance()`.

Cascade earns T1, T2, F1, and F2. T1 is the address of this c. T2 is the square, the multiply turn. F1 is the fate of the orbit of 0, the left pane. F2 is square, then slide, the Julia pane. Not T3, and not F3. Desktop shows the four full names on one row. The phone shows the short ids, each a 44px-class tap.

No headset was in the room. The line stays “No headset session. The shape stays in the void. A headset was not used to check this page.” `data-xr-proof` is `untried`.

The repeller 3/2 at this same c is not the parabolic root. The station guard says Stays, period 1, because the multiplier is 3. `settle()` still says Settles, period 1, for that start. The critical orbit is the one that had to agree, and it does.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The cascade and the accumulation near c = −1.4012 have no book number.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10].
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0.
- Not numbered: local resemblance, small copies, the rotation-number order, the period-doubling cascade, and the accumulation near c = −1.4012.

### Checked

`node tools/check_vectors.mjs` is 186/186. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the one-line desktop caption, the phone stage at 307px while Leave session is showing, the badge link to the cardioid stop, and the hint that does not say to tap the void. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`.

Headless Chrome, no session. Cascade at 1280: header 151px, stage 280px, footer 368px, caption one line, overlap 0, citeStarts, four full thread names, Julia span 2.6. Cascade at 390×844: header 144px, stage 326px, footer 374px, caption two lines, overlap 0, citeStarts, short thread ids, chips one line at 44px. The opening badge links The Cardioid and the Period. The cardioid stop, chip c = −0.75 pressed, reads Parabolic, period 1, and does not say Settles.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/mid_l13_cascade_1280.png`, `/opt/cursor/artifacts/mid_l13_cascade_390.png`, `/opt/cursor/artifacts/mid_cardioid_station_m75.png`.

### Residue for the wide reviewer

The door row is still under the citation, on the phone and at 1280. The badge link is the door on the first screen.

No headset was used. The standing line is smoked. `data-xr-proof` is `untried`.

L11, L12, and L13 are views on the playground station. They are not stops on the Story Map, and they are not Next.

With Leave session, the phone header wraps and the stage is 307px. The actions stay 44px. This pass did not change that row.

The critical orbit at c = −0.75 now agrees: parabolic, period 1, on the station walk and in `settle()`. The repeller 3/2 still reads Stays on the station and Settles in `settle()`. Both are period 1. The multiplier is 3, so it does not attract.

The Feigenbaum point is numerical. It is not a book citation.

Pull request 21 was not merged.

Vectors 186/186. Assembler sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`.

## PR #21 wide review

Branch `cursor/playground-l13-cascade-25d7`, pull request 21, base `gh-pages`. Head at kickoff `9dc82a2`. Zoom: what this page makes the learner notice. The code change is the copy in `js/playground/app.js` and the matching line in `playground.html`. `js/playground/playground.js` and `tools/playground.js` were not edited. Both are still sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`. `films/shared/hostclock.js` and `js/core/anim.js` were not edited. Verdict: **READY**. This pass does not merge and does not redeploy.

### What the learner is asked to see

The first screen asks one question: what happens to the orbit of 0 as real c walks? The caption stays the one-line claim, “The real orbit of 0 splits. Those places light on the Julia set.” The left pane is that orbit, from the tip to the cusp. The right pane is the Julia set, and the places of the orbit light there. The chips are the walk: one place, then two, then four, then the pile-up. The bulbs’ question, which c keep the walk from 0 bounded, is off this page. That question belongs to the set of c, and this left pane is not that set.

### The five questions

The question sits under the picture and above the chips. One formula, the orbit of 0. At 1280 the header is 151px, the stage is 280px, the caption is one line, and the question, the chips, and the start of the badge are on the glass. At 390×844 with no session the header is 144px and the stage is 326px. With Leave session the header is 162px, the stage is 307px, and the actions stay 44px. The chapter sentence still starts on the glass.

Cascade is a different question from the bulbs and from the diary. The sentence under the chapter line says so: real c walks, the orbit of 0 splits, the bulbs are the other question, and a tap does not write a set back. The opening badge is the split. Two places, 0 and −1, light in turn. The multiplier is 0. Walk left and it doubles again. Theorem 4.2.20 is period 1, on The Cardioid and the Period. Figure 4.2.13 still draws the bulb. Enter and Space leave the diary flash empty.

The lights teach. At c = −1 the lit place is orange and the waiting place is green. Over 1.2s of the 2.4s roll those two swapped, about 108px apart on the Julia pane, both on the real axis. That is 0 and −1 taking turns. The roll is the one the bulbs already use. Reduced motion still holds every place steady. At the pile-up the pane has no cycle dots, and the badge says no places light.

The three landmarks read as the cascade. At c = −0.75 the badge says parabolic hinge, this is where one place becomes two, the place holds still, fixed point −1/2, multiplier −1, period 1, and the fixed point does not attract, so this c is outside the main cardioid of Theorem 4.2.20. At c = −1 the badge says the orbit has split into two places, the multiplier is 0, and this is not a fixed point. At the pile-up the badge says the periods have piled up near c = −1.4012, the bands have run together, no cycle of length 32 or less owns this c, and no places light. The book does not number that point. The old sentence said no cycle had settled, which read as a failed computation.

The bar also ticks c = −5/4. That is the next hinge: two places becoming four, multiplier −1. A 512-step probe was reporting period 4, and the four places were two pairs a pixel apart, so the roll shimmered. The badge now says the hinge, and the paint holds the two places −1/2 ± √2/2. They stayed put across 1.2s. The assembler was not changed. z² + z − 1/4 = 0, the product is −1/4, and the multiplier is 4 times that product.

The footer doors stay under the citation. Pulling them up would push the chapter sentence off the phone glass, the same choice mid made. The first-screen door is the name in the badge, The Cardioid and the Period, and the sentence says why: Theorem 4.2.20 is period 1, the right-hand end of this line. The door titles still name the numbered stops.

### Fixed

The cascade formula is one question. The bounded question stays on the bulbs, the diary, and the set of c.

The opening badge, the other period-2 sentence, the cardioid, the cusp, the tip, and periods 4, 8, 16, and 32 say where this c sits on the walk. The pile-up says the bands have run together. The hinge at c = −0.75 says one place becomes two and the place holds still.

At c = −5/4 the overlay holds the two parabolic places. The probe’s four-place shimmer is gone at that one value.

The 1280 smoke check waits until the stage has left the phone band. A resize was measuring the phone footer for one frame and reporting a 263px stage. At rest the stage is 280px.

### Decisions

The caption stays the one line mid locked. The header and the phone stage stay the bulbs chrome.

The door row stays under the citation. The badge link is the door on the first screen.

L11, L12, and L13 stay views on the playground station, off the Story Map and off site Next.

The 2.4s roll stays. It is the bulbs’ clock, and the swap is visible.

No headset was in the room. The line stays “No headset session. The shape stays in the void. A headset was not used to check this page.” `data-xr-proof` is `untried`.

The repeller 3/2 at c = −0.75 is left as mid left it. The station says Stays, `settle()` says Settles, both period 1, multiplier 3. The cascade copy does not mention it. The critical orbit is the parabolic root, and that one agrees.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The cascade, the hinges along it, and the accumulation near c = −1.4012 have no book number. The value is the assembler’s `FEIGENBAUM`.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10].
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0.
- Not numbered: local resemblance, small copies, the rotation-number order, the period-doubling cascade, and the accumulation near c = −1.4012.

### Checked

`node tools/check_vectors.mjs` is 186/186. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the one question, the hinge sentence, the pile-up sentence, the one-line desktop caption, and the chapter sentence on the glass. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`.

Headless Chrome, no session. Cascade at 1280, opening c = −1: header 151px, stage 280px, footer 368px, caption one line, overlap 0, citeStarts, the question and the chips and the badge start on the glass, Julia span 2.6. Cascade at 390×844, no session: header 144px, stage 326px, footer 374px, caption two lines, overlap 0, citeStarts. With Leave session, the smoke measured header 162px, stage 307px, actions 44px.

At c = −1 the orange place and the green place swapped between two samples 1.2s apart. At c = −1.25 the two places were the same pair after 1.2s.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/wide_l13_open_1280.png`, `/opt/cursor/artifacts/wide_l13_open_390.png`, `/opt/cursor/artifacts/wide_l13_hinge_1280.png`, `/opt/cursor/artifacts/wide_l13_pile_1280.png`, `/opt/cursor/artifacts/wide_l13_cardioid_1280.png`.

### Residue

The door row is still under the citation. The badge link is the door on the first screen.

No headset was used. `data-xr-proof` is `untried`.

L11, L12, and L13 are views on the playground station. They are not stops on the Story Map, and they are not Next.

With Leave session, the phone header wraps and the stage is 307px. The actions stay 44px.

The repeller 3/2 at c = −0.75 still reads Stays on the station and Settles in `settle()`. Both are period 1. The multiplier is 3.

The Feigenbaum point is numerical. It is not a book citation.

The period-8 birth is not a tick on the bar. Periods 4, 8, 16, and 32 use the doubling sentence. The marked hinges are c = −0.75 and c = −1.25.

Pull request 21 was not merged.

Vectors 186/186. Assembler sha256 `8c90b8c9be547249c9164f537ab2aa955c419fcca661f77022417dbb47b26c17`.

READY


## PR #22 close review

Branch `cursor/playground-l14-rays-aec7`, pull request 22, base `gh-pages`. Head at kickoff `55d09d0`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy. The assembler was not edited. `films/shared/hostclock.js` was not edited. The Story Map order and the citation sentences were not edited.

### Fixed

The rays canvas was a left-column grid item. Cascade, bulbs, and twins already paint one bitmap across both panes. Rays did not, so the set of c and the Julia set were squeezed into the left half and the ray strokes, drawn on the full overlay, did not sit on that paint. `#stage[data-split="rays"] #fractal` now spans the stage the way the cascade does. At 1280 the canvas is 1280×280. At 390 it is 390×326. Both panes are the picture.

A pinch on the rays started the zoom clock. Wheel, plus, and minus already returned before changing the span. Pinch did not. Pinch and wheel now return the way the cascade does. A sampled pixel at the middle of the left pane was unchanged after a two-finger pinch and a wheel. Julia span stayed 2.6. Enter and Space left the diary flash empty. Cusp and Tip still jump the landing: angle 0 is parabolic at c = 1/4, angle 1/2 is the tip at c = −2.

The door row is 44px tall. The shared door was 2.75rem, taller than that row, so the top and bottom of each door were clipped. Each door is now 44px and fills the row. The row still scrolls sideways. On a phone the seven doors read, and the chapter sentence still starts on the glass.

On a phone the header actions for twins, bulbs, cascade, and rays are at least 44px in both directions. Next was the short one. With Leave showing, the four actions stay inside 390px, Leave is 54×44 with the accessible name “Leave session”, and the cascade stage stays 326px. The header is 144px. Overlap with the stage is 0.

The period-8 numeral sits about 10px from the period-4 numeral on a 390px pane, inside an 11px glyph. The 8 is lifted one line when the ticks are that close, and each numeral sits on a plate in the page background so the bifurcation dots do not eat it. At 1280 the three numerals 2, 4, and 8 are separate and readable on the bar. The phone cascade stays usable: the chips are one 44px row, the stage is 326px, and the 8 is above the 4 rather than on top of it.

### Decisions

The caption stays the builder’s sentence. At 1280 it is one line, the header is 151px, and the stage is 280px, the cascade chrome. At 390 it is two lines and the stage is 326px. The stage starts where the header ends. Nothing covers a pane.

The pile badge wraps inside its measure. It does not overflow sideways. At 390 with Leave showing, the badge bottom is on the glass (730 against a visible footer edge of 843), the ratio sentence is in that badge, and the chapter sentence still starts on the glass. The rest of the citation scrolls inside the footer, which is the footer’s job.

Cusp and Tip stay the only chips. They are on the glass at both sizes, 44px or taller, and a tap hits the chip. Arrow keys still swap the two landings. The book does not number external rays, and this pass does not draw a complex ray.

No headset was in the room. The line stays “No headset session. The shape stays in the void. A headset was not used to check this page.” `data-xr-proof` is `untried`.

`settle()` was already the reading this pass confirmed, and the assembler was left byte-identical. c = −0.75, z0 = 3/2 is Stays, reason repeller, period 1. z0 = −1/2 is Parabolic, period 1. c = −1 is Settles, period 2. c = 1/4 is Parabolic, period 1.

Next from the paper is the twin, then the bulbs, the cascade, and the two real rays. The assembler and section 3.3 stay off Next. `playground.html#rays` opens the cusp. The same hash opens the other three rooms.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10].
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0.
- Chapter 1 §4 is cited as Arg. The stored URL is the product figure in that section (`sec_geometry-2.html#fig_ch-01-17`). A dedicated Arg anchor is not in `textbook.js`.
- Not numbered: external rays and where a ray lands, the Feigenbaum limit (about 4.669), the period-doubling cascade, the period-8 birth, local resemblance, the small copy, and rotation-number order of the bulbs.

### Checked

`node tools/check_vectors.mjs` is 192/192. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, and rays. `node tools/playground-smoke.mjs` exits 0, including the rays canvas across the stage, header actions at least 44px, pinch and wheel leaving the picture and the diary flash alone, the phone chapter sentence, and Leave with the cascade stage at 326px. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `b8ce93482c6daa6f9bfcdbc19b836dfab5425ba794f1a5d12e03d4e4cb21ecee`.

Headless Chrome. Rays at 1280, opening on the cusp: header 151px, stage 280px, canvas 1280 wide, caption one line, overlap 0, cite starts, doors above the citation, Cusp pressed, Julia span 2.6. Rays at 390×844: header 144px, stage 326px, canvas 390 wide, caption two lines, overlap 0, cite starts, both chips on the glass at 44px. With Leave, the stage stays 326px and Leave is 54×44 inside the width. Cascade at 390 with Leave and the period-8 birth: stage 326px, four chips on one row, doors above the citation. Cascade at 1280 on that birth: stage 280px, numerals 2, 4, and 8 readable. Pile badge at 390 does not overflow sideways, and the chapter sentence still starts.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/close-l14-rays-1280.png`, `/opt/cursor/artifacts/close-l14-rays-390.png`, `/opt/cursor/artifacts/close-l13-cascade-leave-390.png`, `/opt/cursor/artifacts/close-l13-period8-1280.png`.

### Residue for mid and wide

The door row still scrolls sideways. On a wide window the disk and the cardioid start past the right edge. The scrollbar sits on the bottom edge of the 44px line. The words in view are complete. A phone scrolls the same row.

The header meets the stage. There is no gap and no overlap. At 1280 the stage is 280px under a 151px header. The footer is the tall part of that window.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Complex external rays are not drawn. The period-16 birth is a number in the gap ratio and is not a tick. The Feigenbaum limit is numerical. It is not a book citation.

Pull request 22 was not merged.

Vectors 192/192. Assembler sha256 `b8ce93482c6daa6f9bfcdbc19b836dfab5425ba794f1a5d12e03d4e4cb21ecee`.

## PR #22 mid review

Branch `cursor/playground-l14-rays-aec7`, pull request 22, base `gh-pages`. Head at kickoff `9a670d2`. Zoom: site tie-in and Test 1 quality. Does L14 feel like the rest of One Point, Two Addresses? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

On the set-of-c pictures the door row wraps from 1100px up. At 1280 the disk and the cardioid sit on the glass, each door 44px, and the row does not scroll. The phone stays one 44px line that scrolls. The stage stays 280px at 1280 and 326px at 390. The chapter sentence still starts on the glass. The roots split does not wrap. Its citation was already on the last line of that window, and a second door line pushed it off by 6px.

The rays citation now names the four badges in the same grammar as the cascade. T1 is one point, two addresses, and the angle is the other address (Chapter 1 §4, Arg). T2 is the square. F1 is the fate of the orbit of 0 at the landing. F2 is the right pane, the Julia set, square then slide. The old sentence had called the left pane F2. Theorem 4.2.20 is the cardioid. Angle 0 lands on its cusp. Angle 1/2 lands at the tip, c = −2, which is not that cardioid. Definitions 4.2.17 and 4.2.18 name an attracting fixed point, and the cusp is not that point. Exercise 8 is the half-line past 1/4. Exercise 4 is the disk at c = 0, inside the set, not a ray. Theorem 4.2.11 is one piece when the orbit of 0 stays bounded. The book still does not number external rays or where a ray lands.

`settle()` at c = −2 now agrees with the page walk and with the badge. The critical orbit and the point z0 = 2 are Stays, reason `repeller`, period 1. The multiplier is 4. A start at z0 = 3 still Leaves. The locked readings are unchanged: c = −0.75, z0 = 3/2 is Stays; z0 = −1/2 is Parabolic; c = −1 is Settles, period 2; c = 1/4 is Parabolic. The cascade tip uses the same word and the Stays colour. It had been painted as a Leave.

The Story Map line for the set of c says a real ray is the other address of one landing, the angle beside c. Next from the paper is still the twin, then the bulbs, the cascade, and the rays. `playground.html#rays` still opens the cusp.

### Decisions

The phone scroll stays. Seven full station titles do not fit in 366px. A second line there would spend the slack that holds “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” on the glass. The stage stays 326px. Below 1100px the row still scrolls. That includes a phone. It is the chrome that keeps the chapter sentence.

The wrap is only the pictures whose doors are the disk and the cardioid: the diary, the twins, the bulbs, the cascade, and the rays. Those are the throughline from the set of c back to Exercise 4 and Theorem 4.2.20. The wide window was hiding the landing.

No complex ray is drawn. Angle 1/3, 2/3, 1/7, and 2/7 are not on the page. The period-16 birth is not a tick. The Feigenbaum limit, the cascade, the period-8 birth, the local resemblance, the small copy, and the bulb order stay unnumbered.

Chapter 1 §4 is still cited as Arg. The stored URL is still the product figure `sec_geometry-2.html#fig_ch-01-17`. A dedicated Arg anchor is still not in `textbook.js`.

No headset was in the room. The line stays “No headset session. The shape stays in the void. A headset was not used to check this page.” `data-xr-proof` is `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The rays sentence that put both rays on the cardioid is gone. The tip is not that body.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid. Angle 0 lands on its cusp. Angle 1/2 does not.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10]. An attracting fixed point. The cusp is not that point.
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0. Not a ray.
- Chapter 1 §4 is cited as Arg. The stored URL is the product figure in that section (`sec_geometry-2.html#fig_ch-01-17`). A dedicated Arg anchor is not in `textbook.js`.
- Not numbered: external rays and where a ray lands, the Feigenbaum limit (about 4.669), the period-doubling cascade, the period-8 birth, local resemblance, the small copy, and rotation-number order of the bulbs.

### Checked

`node tools/check_vectors.mjs` is 195/195. Three readings were added for the tip: z0 = 0 Stays, z0 = 2 Stays, z0 = 3 Leaves. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, and rays. `node tools/playground-smoke.mjs` exits 0, including the disk and the cardioid inside the rays row at 1280, the phone door row still 44px and still scrolling, the phone stage between 300 and 340, and the chapter sentence on the glass. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `1df7ebbf2b9c7607fc853111279edeb492421887fe512001c56fc583e09ab719`.

Headless Chrome. Rays at 1280, opening on the cusp: the door row wraps, the disk and the cardioid are inside it, header at most 160px, stage between 270 and 300, caption one line, cite starts, Cusp pressed, Julia span 2.6. Rays at 390×844: stage between 300 and 340, the door row is 44px and still scrolls, caption two lines, cite starts, both chips on the glass at 44px. Cascade at 390 with Leave: stage 326px, Leave 44px, cite starts. Cascade at 1280: stage 280px, cite starts, numerals 2, 4, and 8 still readable on the period-8 birth.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l14-rays-1280.png`, `/opt/cursor/artifacts/l14-rays-390.png`, `/opt/cursor/artifacts/l14-rays-tip-390.png`, `/opt/cursor/artifacts/l13-leave-390.png`, `/opt/cursor/artifacts/l13-cascade-1280.png`, `/opt/cursor/artifacts/l13-period8-1280.png`.

### Residue for wide

Below 1100px the door row still scrolls sideways. On a phone the disk and the cardioid start past the right edge. The chapter sentence stays on the glass, and the stage stays 326px. That scroll is the phone chrome. A wide window, 1100px and up, shows both doors.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Complex external rays are not drawn. The period-16 birth is a number in the gap ratio and is not a tick. The Feigenbaum limit is numerical. It is not a book citation.

Pull request 22 was not merged.

Vectors 195/195. Assembler sha256 `1df7ebbf2b9c7607fc853111279edeb492421887fe512001c56fc583e09ab719`.

## PR #22 wide review

Branch `cursor/playground-l14-rays-aec7`, pull request 22, base `gh-pages`. Head at kickoff `a2ab56c`. Zoom: what the first screen makes a learner notice. Verdict: **READY**. This pass does not merge and does not redeploy.

The page mid shipped asked “where does this real ray land?” and then spent the glass on a Mandelbrot, a Julia set, and a fate paragraph. The course title was a chip and a sentence in the citation. On a phone the stored window clipped the tip and left angle 0 a stub, so the second landing was a change of text. That is wallpaper. L14 is the course title on the set of c, or it is not this room.

### Fixed

The caption is now the sentence. “One landing, two addresses. c, and the angle of the ray.” It stays one line at 1280 and two lines at 390, so the header stays inside 160px and the phone stage stays inside 300 to 340. The question under the picture is “Where do c and this angle land?” The formula writes c as 1/4 or −2, the same names as the badge. The picture labels both rays, “angle 0” and “angle 1/2”, on a plate above the landing. The bright stroke is the angle in the formula. The quiet stroke is the other one.

A tall pane was hiding that. The assembler still stores centre −0.6 and span 3.2, and a wide pane still uses that window, so the desktop picture is the one mid shipped, with both tails. A phone pane is about twice as tall as it is wide. On that span the tip at −2 sat off the left edge and the cusp ray was a few pixels. The bitmap and the overlay now widen only when the pane cannot hold both landings with a tail of 1/2. The stored composition is not rewritten. Julia stays centre 0, span 2.6. Pinch, wheel, Enter, and Space still do not zoom and do not flash the diary.

The cusp badge says this c is 1/4, then Parabolic, then not Settles. The tip badge says Stays: the point 2 repels, so this is not Settles. Two landings, two verdicts. The chip names say the same pair of addresses. The screen-reader line says it too.

### Decisions

The phone door row still scrolls. Seven titles do not fit in 366px, and a second line would spend the slack that holds the chapter sentence and the 326px stage. The throughline of this page is no longer waiting on those doors. It is the caption and the two labeled rays. From 1100px up the row still wraps, and the disk and the cardioid stay on the glass. Next is still paper, twin, bulbs, cascade, rays. Those doors teach the map on a wide window. On a phone they are the rest of the footer.

No complex ray is drawn. Angle 1/3, 2/3, 1/7, and 2/7 are not on the page. The period-16 birth is not a tick. The Feigenbaum limit, the cascade, the period-8 birth, the local resemblance, the small copy, and the bulb order stay unnumbered.

Chapter 1 §4 is still cited as Arg. The stored URL is still the product figure `sec_geometry-2.html#fig_ch-01-17`. A dedicated Arg anchor is still not in `textbook.js`.

On a phone the Julia pane cannot show the point 2. Span 2.6 at centre 0, on a pane about 195 by 326, reaches about ±0.8 on the real axis. The badge names the point. The landing the learner is asked to see is c = −2, on the set of c, and that one is on the glass. The Julia window was not moved.

No headset was in the room. The line stays “No headset session. The shape stays in the void. A headset was not used to check this page.” `data-xr-proof` is `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], anchor `Fixed_point_Def`. Attracting fixed point, the main cardioid. Angle 0 lands on its cusp. Angle 1/2 does not.
- Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10]. An attracting fixed point. The cusp is not that point.
- Figure 4.2.13 [PDF Figure 4.6, page 114], `fig_ch-04-cp-6`.
- Exercise 10, the main cardioid (`x4_2_10`).
- Theorem 4.2.11 [PDF Theorem 4.9], connectedness (`Kc_Connected`).
- Exercise 8, real c > 1/4 and the parabolic landing at c = 1/4 (`x4_2_8`).
- Exercise 4, the disk at c = 0. Not a ray.
- Chapter 1 §4 is cited as Arg. The stored URL is the product figure in that section (`sec_geometry-2.html#fig_ch-01-17`). A dedicated Arg anchor is not in `textbook.js`.
- Not numbered: external rays and where a ray lands, the Feigenbaum limit (about 4.669), the period-doubling cascade, the period-8 birth, local resemblance, the small copy, and rotation-number order of the bulbs.

### Checked

`node tools/check_vectors.mjs` is 195/195. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, and rays. `node tools/playground-smoke.mjs` exits 0, including the new caption, the question, both landings inside the pane at 1280 and at 390, the tip called Stays, pinch and wheel leaving the picture and the diary flash alone, the phone door row still 44px and still scrolling, and the phone stage between 300 and 340. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `1df7ebbf2b9c7607fc853111279edeb492421887fe512001c56fc583e09ab719`.

Headless Chrome. Rays at 1280 open on the cusp: the caption names the two addresses, the formula shows c = 1/4, both rays are on the glass, angle 0 is the bright stroke. Tip at 1280: the bright stroke is the half-line leaving −2, the badge says Stays, Julia span stays 2.6. Rays at 390: both labels and both tails are inside the left pane, the chapter sentence starts on the glass, the stage stays in range. Tip at 390: the bright stroke leaves the left edge, c = −2, Stays.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l14-rays-1280.png`, `/opt/cursor/artifacts/l14-rays-tip-1280.png`, `/opt/cursor/artifacts/l14-rays-390.png`, `/opt/cursor/artifacts/l14-rays-tip-390.png`.

### Residue

Below 1100px the door row still scrolls sideways. On a phone the disk and the cardioid start past the right edge. The chapter sentence stays on the glass, and the stage stays 326px.

On a phone the point z = 2 sits outside the Julia pane. The badge names it. The Julia window stays centre 0, span 2.6.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Complex external rays are not drawn. The period-16 birth is a number in the gap ratio and is not a tick. The Feigenbaum limit is numerical. It is not a book citation.

Pull request 22 was not merged.

**READY**

Vectors 195/195. Assembler sha256 `1df7ebbf2b9c7607fc853111279edeb492421887fe512001c56fc583e09ab719`.

## PR #24 close review

Branch `cursor/playground-l15-pole-945f`, pull request 24, base `gh-pages`. Head at kickoff `97a6fdb`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy. The assembler was not edited. The Story Map order and the citation sentences were not edited.

### Fixed

A width change left the long door names and the long thread sentences on screen for a frame after the viewport had already narrowed. Those names each took a row, the door block grew to about 289px, and “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” started below the glass. The resize handler, and the changes of `(max-width: 480px)` and `(max-width: 1099px)`, now apply the short door names, the thread ids, the Leave label, and the chrome band in that same turn, and once more on the next frame. Leaving the page cancels that frame. The extra frame only refits chrome. It does not draw the picture.

The phone checks for the twins and for the rays now wait until the visible door says Disk, the thread row has dropped the long “Square” sentence, and the chapter sentence has started on the glass. They were reading the frame before that refit.

### Decisions

The pedagogy and the Story Map stay as they landed. L15 opens on the pair, angles 1/3 and 2/3, both at c = −3/4. The left pane is the sphere. The right pane is the Julia set. Cusp, Pair, and Tip stay the three chips. Pair presses both complex strokes, because both rays carry that name. Pinch, wheel, Enter, and Space still do not zoom and do not flash the diary.

Below 1100px the set-of-c doors keep the short visible labels. The accessible name stays the full station title. At 1100px and up the full names return, and the pole row does not scroll. Header actions on the pole, the rays, the cascade, the bulbs, and the twins stay at least 44px. On a phone Leave reads “Leave” and the accessible name stays “Leave session”.

The stored Julia span stays 2.6. At the tip the pane marks both ends, and it widens only when the pane cannot hold them. `__pg.juliaSpan` stays 2.6 when the pane already fits. Period 16 is a tick of the same kind as 2, 4, and 8. Period 32 stays in the pile.

`pg-pole` stays part J, thread F2, order 22, after `pg-rays`. Next from the paper is the twin, the bulbs, the cascade, the rays, and the pole. The assembler and section 3.3 stay off Next. `playground.html#pole` opens the picture.

No headset was in the room. The line stays “A headset was not used to check this page.” `data-xr-proof` is `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The pull-request body already lists these, so that body was left as written.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book.
- HTML Figure 1.4.1 is `fig_ch-01-15`. Definition 1.4.6 is the anchor `Arg_z`. The open-edition PDF figure number and page for Figure 1.4.1, and the PDF number for Definition 1.4.6, were not confirmed. The product stays Figure 1.4.13 (`fig_ch-01-17`).
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, and the bulb rotation-number order.

### Checked

`node tools/check_vectors.mjs` is 200/200. `node tools/fractal-smoke.mjs` exits 0, including the five rooms twin, bulbs, cascade, rays, pole, and the argument figure 1.4.1. `node tools/playground-smoke.mjs` exits 0, including the pole at 390 and at 1280, the rays chips, pinch and wheel and Enter and Space leaving the span at 2.6 and the diary flash empty, the tip holding both ends with `__pg.juliaSpan` at 2.6, the period-16 hinge, the wrapped disk and cardioid with the chapter sentence on the glass, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

The live boot graph from `js/app.js` and `js/playground/app.js` is 31 files. None of them import from `kit/`. The comment in `js/app.js` only says why the router does not.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

Headless Chrome, after the picture is idle. Pole at 1280×800: the sphere and the Julia set share the stage, the three chips are on the glass, the doors use the full names and do not scroll, the chapter sentence starts. Pole at 390×844: the same split, short door labels, Disk and Cardioid inside the row, the chapter sentence starts, the header actions are at least 44px. Rays at 390: Cusp, Pair, and Tip are one 44px row inside the width, the door row does not scroll sideways, the chapter sentence starts. Tip at 390 and at 1280: Julia span 2.6 and both ends are in the pane. Cascade at 1280 on the period-16 birth: the badge is the parabolic hinge, eight places becoming sixteen.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l15-pole-1280.png`, `/opt/cursor/artifacts/l15-pole-390.png`, `/opt/cursor/artifacts/l14-rays-390.png`, `/opt/cursor/artifacts/l14-rays-tip-390.png`, `/opt/cursor/artifacts/l14-rays-tip-1280.png`, `/opt/cursor/artifacts/l13-period16-1280.png`.

### Residue for mid and wide

On the twin phone the chapter sentence starts, and the slack under that line is only a few pixels. The rest of the citation scrolls inside the footer. That is the footer’s job. A taller badge on another room can spend it.

Pictures that are not the set-of-c row stay one door line. Below 1100px a long row can still scroll. A second line there pushes the chapter sentence off the glass at 390×844.

The far tails of the complex rays leave the window. That is the ray going out toward infinity.

The period-16 numeral lifts when it would sit on the period-8 plate, the same way 8 lifts off 4. The plates can touch. Period 32 stays in the pile. Mid can look at the left-hand 2 if it sits on the edge of the bar.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 24 was not merged.

Vectors 200/200. Assembler sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

## PR #24 mid review

Branch `cursor/playground-l15-pole-945f`, pull request 24, base `gh-pages`. Head at kickoff `96e1376`. Zoom: site tie-in and Test 1 quality. Does the pole feel like the rest of One Point, Two Addresses? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

The pole was speaking as a sphere with rays leaving it, and the citation still used the general-c gap and the shorthand “Exercise 14 is the lift.” Chapter 1 Exercise 14 is the triangle in Figure 1.4.19. The exercise on this picture is §2.5 Exercise 14, HTML id `x2_5_20`: the coordinates of z = x + iy on the Riemann sphere. The caption, the Story Map room, the Test 2 spine, and the screen-reader line now say the course title. One landing, two addresses, and both leave the north pole. On the pair those addresses are the angles 1/3 and 2/3.

A chip click now repaints that caption. The pair stays “one landing, two angles.” The cusp and the tip stay “one landing, two addresses.” Both sentences name the north pole. The pair badge and the cusp badge stay the shared landing sentences. A longer pair badge wrapped, and “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” left the glass at 390. The tip badge on the pole already said the angle leaves the north pole, and that line still fits.

The rays and the pole cite the angle as the other address. The link opens HTML Figure 1.4.1, `fig_ch-01-15`. The open-edition PDF calls that picture Figure 1.15, printed page 22. Definition 1.4.6 opens on the equation anchor `Arg_z`. The PDF calls that definition Definition 1.11, printed page 23. The product stays Figure 1.4.13, `fig_ch-01-17`. The pole paragraph then names Figure 2.5.2 and the coordinates from Exercise 14. The general-c gap stays off the rays and off the pole. These pictures are three landings.

Thread badges on the pole and the rays stay T1, T2, F1, and F2. T1 is one point, two addresses. T2 is the square. F1 is the fate of the orbit of 0 at the landing. F2 is the right pane, square then slide. The Story Map door still remembers Test 1. The F2 badge is the door back to the Test 2 map, which lists the five rooms. Next from the paper is still the twin, the bulbs, the cascade, the rays, and the pole. The assembler and section 3.3 stay off Next.

### Decisions

The phone pair badge stays short. The caption is the sentence that teaches the north pole. The chapter sentence keeps the slack it has.

“Exercise 14 is the lift” is retired on this picture. The coordinates are the book sentence, and they are named with the section.

The Story Map order stays as close accepted it. Part J, thread F2, orders 18 through 22. This pass does not take the rooms back off Next, and it does not retarget the Story Map door.

The door wrap, the short labels, the period-16 lift, and the complex tails stay as close shipped them. On the period-16 shot the numerals 2, 4, 8, and 16 are readable, and 16 sits above the period-8 plate. That plate layout stays.

Real rays stay exact half-lines. The pair tracer stays. Angles 1/3 and 2/3 land together at c = −3/4.

No headset was in the room. The line stays “A headset was not used to check this page.” `data-xr-proof` is `untried`.

### Citations needing Shael

Howell & Mathews only. The argument page is no longer an open ask. Figure 1.4.1 was read as PDF Figure 1.15, printed page 22. Definition 1.4.6 was read as PDF Definition 1.11, printed page 23. Nothing else numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, and the bulb rotation-number order.

### Checked

`node tools/check_vectors.mjs` is 200/200. `node tools/fractal-smoke.mjs` exits 0, including the five rooms and Arg opening Definition 1.4.6, and the real rays staying on the axis. `node tools/playground-smoke.mjs` exits 0, including the pole at 390 with the chapter sentence on the glass, the printed pages 22 and 23 in the citation, the cusp and the tip captions, the full door names at 1280, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

No new module. The edited files do not import from `kit/`.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

Headless Chrome. Pole at 1280×800 opens on the pair: the sphere and the Julia set share the stage, the caption is one landing and two angles, both leaving the north pole, the doors use the full names, and the citation names Figure 1.4.1 on page 22 and Definition 1.4.6 on page 23. Pole at 390×844: the same caption, Pair pressed, short door labels, Disk and Cardioid inside the row, the chapter sentence starts. Rays at 390 open on the cusp: both angles labeled, the chapter sentence starts, the door row wraps. Cascade at 1280 on the period-16 birth: the badge is the parabolic hinge, and 16 sits above the period-8 plate.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l15-pole-1280.png`, `/opt/cursor/artifacts/l15-pole-390.png`, `/opt/cursor/artifacts/l14-rays-390.png`, `/opt/cursor/artifacts/l14-rays-tip-390.png`, `/opt/cursor/artifacts/l13-period16-1280.png`.

### Residue for wide

On the twin phone the chapter sentence starts, and the slack under that line is only a few pixels. The rest of the citation scrolls inside the footer.

Pictures that are not the set-of-c row stay one door line. Below 1100px a long row can still scroll.

The far tails of the complex rays leave the window. That is the ray going out toward infinity.

The period-16 numeral lifts off the period-8 plate. The plates can touch. Period 32 stays in the pile.

The pair badge and the cusp badge do not repeat “north pole.” The caption does. A longer badge spends the slack that holds the chapter sentence.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 24 was not merged.

**ACCEPT WITH FIXES**

Vectors 200/200. Assembler sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

## PR #24 wide review

Branch `cursor/playground-l15-pole-945f`, pull request 24, base `gh-pages`. Head at kickoff `185980d`. Zoom: what the page makes the learner notice. Is the pole the one-landing moment, or another fractal wallpaper? Verdict: **READY**. This pass does not merge and does not redeploy.

The opening question was the failure. “Which way does this ray leave infinity?” is one ray and a direction. That is the dynamical sphere, and it is also the tails running off the L14 window. The picture on the glass was two strokes from one point, with no names, beside a Julia set large enough to be the whole lesson. A learner could leave holding wallpaper. The pair caption already had the sentence. The question under the picture asked something else, and the cusp caption said “Both leave,” which invents a second departure for angle 0 and angle 1/2.

### Fixed

The pair question is “Why do both angles leave the same pole?” The caption stays “One landing, two angles. Both leave the north pole.” The sphere labels the point “north pole” and names the lit strokes `1/3` and `2/3`. The left plate says “two angles.” The right plate stays “the Julia set,” the landing, not the question.

A cusp or a tip is one ray. The caption is “One landing, two addresses. This ray leaves the north pole.” The question is “Which point does this one ray leave?” The stroke is named `angle 0` or `angle 1/2`. The left plate says “one ray.” “Both leave” is the pair only. No ray number was invented. The book line stays: the book does not number external rays.

The Julia door no longer says “this ray” on a landing that can be two angles. It is the Julia set at this landing. The Test 2 spine says angles 1/3 and 2/3 leave the north pole and land together, and that angle 0 and angle 1/2 each leave once. The unlit rays stay on the sphere, quieter, so the other departures are still there and the lit landing is the sentence.

### The five questions

1. The first screen asks where the two angles go by asking why both leave the same pole. The names are on the strokes, above the chips. The thread row and the doors are still there. They do not get the first sentence.
2. Newton asks which root. Curvature asks about the angle sum on this same book sphere. L14 asks where c and the angle land, and the tails leave the window. This page asks about the shared departure. The pair badge still says it is not a Newton root. The citation is Figure 2.5.2 and the coordinates from §2.5 Exercise 14.
3. The pair is the title made visible. One dot on the set, two named angles, one labeled pole. The Julia pane is what that landing writes, labeled as the Julia set.
4. Pair, cusp, and tip stay honest. Two angles both leave, or one ray leaves. The two addresses on a single ray are c and the angle, which the hint says, and the caption does not turn them into two rays.
5. The doors teach the map. Story Map remembers Test 1. Next from the paper is the twin, the bulbs, the cascade, the rays, then the pole: the neighborhood, the period, the real doubling, the plane of the rays, then the point those tails leave. Powers is the square. Julia is the set at the landing. The Mandelbrot door is the set the rays land on. The orbit of 0 is the fate at that landing. The disk is Exercise 4, and it is not a ray. The cardioid door is Theorem 4.2.20, and angle 0 lands on its cusp.

### Decisions

The pair badge and the cusp badge stay the short landing sentences. A longer badge spends the slack that holds “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” on the glass at 390. The north pole is in the caption, the question, and the picture.

The L14 tails stay. A ray on the plane leaves the window. The pole is where that tail arrives. Clipping it would fake a second infinity.

The period-16 numeral stays above the period-8 plate. The plates can touch. Period 32 stays in the pile. That picture’s question is the real orbit, and the badge already says eight places becoming sixteen.

The assembler was not edited. No headset was in the room. `data-xr-proof` stays `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The argument page stays closed: Figure 1.4.1 is PDF Figure 1.15, printed page 22, and Definition 1.4.6 is PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, and the bulb rotation-number order.

### Checked

`node tools/check_vectors.mjs` is 200/200. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the pole question on the pair, the cusp caption refusing “Both leave,” the tip badge, the chapter sentence on the glass at 390, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

No new module. The edited files do not import from `kit/`.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

Headless Chrome. Pole at 1280×800 and at 390×844 opens on the pair: the north pole is named, the strokes read 1/3 and 2/3, the question asks why both leave the same pole, Pair is pressed, and the chapter sentence starts. Cusp at 1280: the lit stroke is angle 0, the plate says one ray, and the question asks which point that ray leaves. Tip at 1280 and at 390: the lit stroke is angle 1/2, the same one-ray question, and the caption does not say both.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/l15-pole-1280.png`, `/opt/cursor/artifacts/l15-pole-390.png`, `/opt/cursor/artifacts/l15-pole-cusp-1280.png`, `/opt/cursor/artifacts/l15-pole-tip-1280.png`, `/opt/cursor/artifacts/l15-pole-tip-390.png`.

### Residue for the next batch

On the twin phone the chapter sentence starts, and the slack under that line is only a few pixels.

Pictures that are not the set-of-c row stay one door line. Below 1100px a long row can still scroll.

The far tails of the complex rays leave the L14 window. That is the ray going out toward infinity. The pole is the place they leave.

The period-16 numeral sits above the period-8 plate. The plates can touch. Period 32 stays in the pile.

The pair badge and the cusp badge do not repeat “north pole.” The caption and the picture do.

On the tip the ray is short, because c = −2 sits near the pole. The name `angle 1/2` sits under that label. It is readable.

The angle names are painted. The caption, the question, the badge, and the hint say the same words.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 24 was not merged.

**READY**

Vectors 200/200. Assembler sha256 `8bb6912b7555a9e20b901e665f58baa13c6ea472ca577caca13ccbe7bac5b258`.

## PR #25 close review

Branch `cursor/playground-l16-join-659d`, pull request 25, base `gh-pages`. Head at kickoff `8ce89d3`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen? Verdict: **ACCEPT**. This pass does not merge and does not redeploy. The assembler was not edited. The Story Map order and the citation sentences were not edited.

### The first screen

At 1280×800 the join stage is 280px, under a 151px header, above a 368px footer. Overlap of the stage into the footer is 0. The two panes share that stage. Polar, i, Zero, and Pair are one row of 47px chips, and a hit in the middle of each lands on the button. Header actions are 47px. The seven doors use the full names, wrap to two rows, and do not scroll. “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” starts on the glass, with 56px under that sentence.

At 390×844 the join stage is 326px, under a 144px header, above a 374px footer. Overlap is 0. Nothing on the page scrolls sideways. The four chips are 44px, Pair ends at x=378, and each hit lands on the button. Header actions are 44px and Next ends at x=378. The doors use the short names, wrap to two rows, and do not scroll. Disk and Cardioid are on the glass. The chapter sentence starts, with 66px under it. The formula for −1 + i√3 is 262px wide and ends inside the pane.

### Gestures

Polar, i, Zero, and Pair each press one chip. Polar is −1 + √3 i, length 2, Arg 2π/3. i is length 1, Arg π/2. Zero is c = 0, length 0, Arg not defined, Exercise 4. Pair is −3/4, length 3/4, Arg π. A touch on the left pane moved c off the pair, and the badge followed. The Julia span stayed 2.6. A wheel and a two-finger pinch left that span alone, and the flash stayed empty. Enter and Space left the flash empty.

### The residue from the pole review

Twin at 390×844: stage 265px, footer 435px, which is the `min(54dvh, 25.6rem)` cap. The chapter sentence starts, with 60px under it. The twin and the copy are 47px and take the tap.

Door rows at 390 and at 1280 do not scroll sideways. On the roots phone the seven short names are one 44px line, Julia ends at x=366, and the chapter sentence starts with 40px under it. On the roots desktop the full names wrap to two rows, the row does not scroll, and the chapter sentence is on the glass. The slack under that sentence is 8px, which is the footer’s own padding. The sentence is not clipped.

Complex rays on the pair, at 1280. The outer 3px of the left pane is empty except the real half-line meeting the edge. The outer twelfth is faint. The landing names do not sit on each other.

Period 16 and period 8, at 1280, on a 640px pane. The “16” glyphs run from x=136 to x=159, left of the tick at x=172. The “8” glyphs run from x=206 to x=220, right of the tick at x=180. The gap between the glyphs is 47px. On a phone pane the same two plates keep about 18px between the glyphs. They do not collide.

The tip at 1280: “north pole” and “angle 1/2” do not share a row or a column. On a phone the angle name starts at the left edge of the 195px pane and the pole name starts further right. The glyphs of “angle 1/2” are the same width as on the wide pane, so the word is not clipped. It does not meet the pole label.

### Story Map, the boot graph, and the headset

`pg-join` is part J, thread F2, order 23, after `pg-pole`. Next from the paper is the twin, the bulbs, the cascade, the rays, the pole, and the join. The assembler and section 3.3 stay off Next. `playground.html#join` opens the picture.

The live boot graph from `js/app.js` and `js/playground/app.js` is 31 files. None of them import from `kit/`. `js/core/map-route.js` matches `kit/template/js/core/map-route.js`.

No headset was in the room. `data-xr-proof` is `untried`. The line stays “A headset was not used to check this page.”

### Citations needing Shael

Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23. Those two are not reopened.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, and the bulb rotation-number order.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 203/203. `node tools/fractal-smoke.mjs` exits 0, including the six rooms twin, bulbs, cascade, rays, pole, join. `node tools/playground-smoke.mjs` exits 0, including the join at 390 and at 1280, pinch and Enter and Space on the rays, the period-16 hinge, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` are byte-identical. sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/close-l16-join-1280.png`, `/opt/cursor/artifacts/close-l16-join-390.png`, `/opt/cursor/artifacts/close-l11-twin-390.png`, `/opt/cursor/artifacts/close-roots-390.png`, `/opt/cursor/artifacts/close-roots-1280.png`, `/opt/cursor/artifacts/close-l14-rays-pair-1280.png`, `/opt/cursor/artifacts/close-l14-rays-390.png`, `/opt/cursor/artifacts/close-l13-period16-1280.png`, `/opt/cursor/artifacts/close-l15-tip-1280.png`, `/opt/cursor/artifacts/close-l15-tip-390.png`.

### Residue for mid and wide

On the roots desktop the chapter sentence is on the glass, and the slack under it is the footer padding, 8px. On the rays phone that slack is 14px. The rest of each citation scrolls inside the footer.

On the tip phone the name `angle 1/2` sits against the left edge of the pane. It does not meet “north pole.”

The join, the rays, and the pole repaint the overlay while the picture is up. The paint does not move. The clock stops when the tab is hidden, and `__pg.stop()` stops it. A paused scrub still draws nothing.

The roots phone stacks the set of c under the basins. The stage there is 231px. The doors stay one line.

Period 32 stays in the pile. Real half-lines on L14 still meet the pane edge. The tip stroke is short, because c = −2 sits near the pole.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 25 was not merged.

**ACCEPT**

Vectors 203/203. Assembler sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

## PR #25 mid review

Branch `cursor/playground-l16-join-659d`, pull request 25, base `gh-pages`. Head at kickoff `da11cfd`. Zoom: site tie-in and Test 1 quality. Does the join teach one point with two addresses, and do the citations match the picture? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

The opening picture was an angle and a Julia set. Cartesian was a word in the caption. The left pane now draws both addresses of the same point. Dashed lines are how far across and how far up. The ray and the arc are the length and Arg, measured from the positive real axis. The right pane is the Julia set of that point. The opening point stays −1 + i√3, length 2, Arg 2π/3. The formula writes that polar form. Figure 1.4.1 and Definition 1.4.6 name the angle. The open edition still prints no exercise number for that polar form, and the page still says so. Review problem 1.3.1 is not used as a textbook exercise.

Zero was citing Exercise 4 as the place where Arg is not defined. Those are two sentences. Figure 1.4.1 notes that the angle is undefined if z = 0. Exercise 4, HTML id `x4_2_4`, is the disk: the walks that stay are the closed unit disk. The chip, the badge, the caption, the question, the door, and the citation now say both, and they say the missing angle is not the exercise. At 0 the picture draws no ray and no drops. The caption is “No angle at 0.” The question is “Why does one address stop?”

Pair was calling Arg π the rays of the period-2 landing. Arg π is the address of the point c = −3/4. Angles 1/3 and 2/3 are the rays that share that landing. The badge, the door, and the Test 2 spine say that. The arc on the picture is the upper half-turn, which is Arg π in (−π, π].

Thread badges on the join are T1, F1, and F2. T1 is the two addresses. F1 is whether the orbit of 0 stays, which is the colour on the left. F2 is the right pane, square then slide. T2 stays off. T2 is the staircase: z, arg z, Arg z. This picture draws Arg, the one name, and the citation says it does not draw the other names. Lighting “The staircase” would claim those names. F3 stays off. This picture is not which root. The Story Map room stays part J, thread F2, order 23. Next from the paper is still the six rooms through the join. A hash `#join` still opens the picture while the assembler is locked. R26 still keeps the join on the Julia map. R27 still refuses basin and curvature.

A second browser tab hides the page. The roll clock does not advance while the tab is hidden, which is the rule. The hash check was leaving the live tab hidden, so the next picture sat in `roll`. The check brings that tab forward before the next picture. The product clock was left as it is.

### Decisions

Exercise 4 stays the disk. The missing angle stays Figure 1.4.1. Putting both jobs on one exercise would teach the wrong sentence.

T2 stays off on this picture only. The rays, the pole, the cascade, and the bulbs still wear T2, and on those pictures the sentence is the square. The join’s sentence is Arg, and the other names are absent, so the staircase badge would be the dishonest one.

The arc at a negative real point is the upper half-turn. Definition 1.4.6 takes Arg in (−π, π], so π is the included edge. The page does not draw −π.

On an axis the Cartesian drop of length zero is omitted, and the other drop lies on the polar ray. The arc is the mark that keeps the two addresses apart. i is a quarter-turn. Pair is the half-turn. Wide can look at whether that reads at a glance. This pass does not offset a stroke to fake a second line.

Figure 1.4.1 and Definition 1.4.6 stay closed: PDF Figure 1.15, printed page 22, and PDF Definition 1.11, printed page 23.

No headset was in the room. `data-xr-proof` stays `untried`.

### Citations needing Shael

Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 and Definition 1.4.6 stay closed. Mid did not add a number. It stopped using Exercise 4 as the name of the missing angle.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book. Exercise 4 is the disk at c = 0. The missing angle is Figure 1.4.1, which is already closed.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, and the bulb rotation-number order.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 203/203. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the join at 390 and at 1280, i at Arg π/2, zero with no angle and Exercise 4 as the disk, the pair with Arg π not the rays, the locked hash, R26, R27, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

The live boot graph does not import from `kit/`.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

Headless Chrome. The join at 1280×800 and at 390×844 opens on −1 + i√3. The dashed drops and the ray are on the set of c, the arc is Arg 2π/3, and the Julia set is the other pane. Threads are T1, F1, F2. Zero at 1280: the dot is the origin, the label is “no angle at 0,” and the question asks why one address stops. Pair at 1280: the ray lies on the negative real axis, the arc is the upper half-turn, and the badge says Arg π is not those rays.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/mid-l16-join-1280.png`, `/opt/cursor/artifacts/mid-l16-join-390.png`, `/opt/cursor/artifacts/mid-l16-join-zero-1280.png`, `/opt/cursor/artifacts/mid-l16-join-pair-1280.png`.

### Residue for wide

On the roots desktop the chapter sentence is on the glass, and the slack under it is the footer padding, 8px. On the rays phone that slack is 14px.

On the tip phone the name `angle 1/2` sits against the left edge of the pane. It does not meet “north pole.” The tip stroke is short, because c = −2 sits near the pole.

The join, the rays, and the pole still repaint the overlay while the picture is up. The paint does not move. The clock stops when the tab is hidden, and `__pg.stop()` stops it. A hidden tab does not finish a roll. That is the clock.

The roots phone stacks the set of c under the basins. The stage there is 231px. Period 32 stays in the pile. Real half-lines on L14 still meet the pane edge.

The Cartesian dashes are the same blue family as the set. Both drops are on the opening point. The horizontal drop is the thinner of the two. On i and on Pair, the remaining drop lies on the polar ray, and the arc is the second address. Wide can decide whether that contrast is enough. This pass does not move a stroke off the geometry.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 25 was not merged.

**ACCEPT WITH FIXES**

Vectors 203/203. Assembler sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

## PR #25 wide review

Branch `cursor/playground-l16-join-659d`, pull request 25, base `gh-pages`. Head at kickoff `df6688e`. The paint change is `218d7cc`. Zoom: step back and watch the learner walk. Does L16 Join, with the pole residue from #24, hold together as one story? Verdict: **READY**. This pass does not merge and does not redeploy.

The paper’s Next is the twin, the bulbs, the cascade, the rays, the pole, and the join. That order is the lesson. The twin sets a neighborhood beside the Julia set it resembles. The bulbs name the period as the orbit of 0 and light that cycle on the Julia set. The cascade walks real c and asks what that orbit does as the periods double. The rays give one landing two addresses: c, and the angle. The pole is where those angles leave, one point, the north pole. The join is the site’s name made visible. One point, how far across and how far up, the length and Arg from the positive real axis, and the Julia set that point writes. The opening point is still −1 + i√3, length 2, Arg 2π/3. Figure 1.4.1 and Definition 1.4.6 stay closed. No exercise number was invented for that polar form.

### Fixed

On i and on Pair the remaining Cartesian drop is the polar ray. Mid painted the dash first and the ray on top, so the blue was gone and the citation’s dashed lines were not on the glass. The dash is now painted on that same segment, over the ray. The stroke is not moved off the geometry. At 1280 the i column alternates polar gaps and cart dashes (`P` then `C` along x = 377). The pair row does the same along y = 316. The arc stays the angle: on i it leaves the column toward the positive real axis, and on Pair it is the upper half-turn. Zero still draws no ray and no dash. The overlay there has no cart pixels, only the origin dot. Polar still has both drops. The vertical drop of −1 + i√3 still reads as a light halo and a cart core where it crosses the set.

The screen-reader line on the stage had said the ray is the angle. The picture’s ray is the length and the arc is Arg. The keys line now says the dashed lines are how far across and how far up, and the ray and the arc are the turn and the length. That is the same sentence as the hint.

### Decisions

The light-theme dash center is the set’s blue. The halo is what keeps the drop readable on the opening point, and it is enough. A second blue would invent a colour the course does not have.

T2 stays off. This picture draws Arg, the one name. The staircase is the other names, and they are not on the glass. F3 stays off. This is not which root. The header is T1, F1, F2. The Story Map room stays part J, thread F2, order 23. Next from the paper is still the six rooms. `#join` still opens the picture while the assembler is locked, at level 0. R26 still keeps the join on the Julia map. R27 still refuses basin and curvature. The live boot graph does not import from `kit/`.

The pole residue that does not block the walk stays. On the tip phone, `angle 1/2` sits on the left edge of the pane and does not meet “north pole.” The tip stroke is short because c = −2 sits near the pole. Period 32 stays in the pile. Real half-lines on L14 still meet the pane edge. The complex tails still fade as they leave the window. On the roots desktop the slack under the chapter sentence is the footer padding, about 8px. On the rays phone that slack is about 14px. The join, the rays, and the pole still repaint a still overlay while the picture is up. The paint does not move. The clock stops when the tab is hidden, and `__pg.stop()` stops it. A paused scrub draws nothing.

No headset was in the room. `data-xr-proof` stays `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23. Wide did not add a number.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Confirm these against the book. Exercise 4 is the disk at c = 0. The missing angle is Figure 1.4.1, which is already closed.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, and the bulb rotation-number order.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 203/203. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, rays, pole, and join. `node tools/playground-smoke.mjs` exits 0, including the join at 390 and at 1280, i, zero, and pair, the locked hash, R26, R27, the live boot graph with no `kit/` import, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

Headless Chrome, light theme. The six rooms at 1280 open in Next order: the twin on the neighborhood, the bulbs on period 3, the cascade on the real split, the rays on angle 0 at the cusp, the pole on angles 1/3 and 2/3 leaving the north pole, and the join on −1 + i√3. Join threads are T1, F1, F2. The stage does not overlap the footer. The chapter sentence starts. At 390 the four chips are 44px, Pair ends inside the width, and the page does not scroll sideways. The Julia span stays 2.6. A fresh `#join` opens at level 0.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/wide-twins-1280.png`, `/opt/cursor/artifacts/wide-bulbs-1280.png`, `/opt/cursor/artifacts/wide-cascade-1280.png`, `/opt/cursor/artifacts/wide-rays-1280.png`, `/opt/cursor/artifacts/wide-pole-1280.png`, `/opt/cursor/artifacts/wide2-joinpolar-1280.png`, `/opt/cursor/artifacts/wide2-joini-1280.png`, `/opt/cursor/artifacts/wide2-join0-1280.png`, `/opt/cursor/artifacts/wide2-joinpair-1280.png`, `/opt/cursor/artifacts/wide2-joinpolar-390.png`, `/opt/cursor/artifacts/wide2-joini-390.png`, `/opt/cursor/artifacts/wide2-join0-390.png`, `/opt/cursor/artifacts/wide2-joinpair-390.png`, `/opt/cursor/artifacts/wide-pole-tip-1280.png`, `/opt/cursor/artifacts/wide-pole-tip-390.png`, `/opt/cursor/artifacts/wide-twin-390.png`.

### Residue

The light-theme dash center is the same blue as the set. The halo keeps the drop readable. On an axis the dash and the ray share the segment, and the polar ink shows in the gaps.

On the roots desktop the slack under the chapter sentence is about 8px. On the rays phone it is about 14px.

On the tip phone `angle 1/2` sits against the left edge of the pane. It does not meet “north pole.” The tip stroke is short, because c = −2 sits near the pole.

The join, the rays, and the pole still repaint a still overlay while the picture is up. The paint does not move. The clock stops on hide and on `__pg.stop()`.

Period 32 stays in the pile. Real half-lines on L14 still meet the pane edge. The far tails of the complex rays leave the L14 window. That is the ray going out. The pole is where it leaves.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 25 was not merged.

**READY**

Vectors 203/203. Assembler sha256 `abb0917e80fb80ff03478a0f09be67b07d5e7b1528eaaa1cc5a0084d4989ac28`.

## PR #26 close review

**ACCEPT WITH FIXES**

Close is controls and layout. The pedagogy and the Story Map were left as the builder wrote them.

### What was wrong, and what changed

The climb bitmap was only the left grid column. Join, rays, and the pole already paint one picture across both panes. Climb did not, so the set occupied the left quarter and the addresses, drawn on the full overlay, did not share that set. `css/playground.css` now gives `#stage[data-split="climb"] #fractal` the same full-bleed rule. At 1280 and at 390 the fractal and the overlay are the same width as the stage, the set fills the left pane, and the sphere fills the right.

On a phone the word “climbs” was clamped onto the orbit point. A label now takes the first side that stays inside the pane and off the point, the stroke, the other name, and the corner chip “the orbit of 0”. “north pole” stays above the pole. “stays” and “approaches” stay off their points. On the wide pane the same rule leaves a gap beside the point.

On the tip phone the leader was stroked under the plate, so a dark band sat between the landing and the glyphs of “angle 1/2”. The leader is painted after the letters and starts on them. A pixel row of the orange stroke now ends on the first row of those glyphs. Pair and cusp still use the wide camera. The closer turn stays on the tip, and `bookLift(−2, 0)` is still height 0.8.

The tip badge is a line longer than the rays badge, and the pole phone footer was still on the 22rem cap. The first line of the chapter sentence ended 6px past the glass. The pole now shares the rays and climb phone footer, `min(50dvh, 24rem)` with padding under the sentence. Settled, the tip phone has 28px under that first line, the stage is 292px, and Disk and Cardioid sit on the glass. Chips and header actions stay 44px.

Period 32 was a plate in the plot, and the you-are-here line cut the “2”. The plate is now an opaque nameplate to the left of that line, with a leader into the pile. It is still not a tick. The births of 2, 4, 8, and 16 keep theirs.

The phone climb check was reading the frame before the door names shortened, so the citation had not settled. The wait now holds until the short names are up and the chapter sentence has started. The assertion is the same.

### What was already true

Climb at 1280×800. Stage 1280×280, header 151, footer 368, overlap 0, no sideways scroll. Chapter sentence starts, 56px under the first line. Chips Polar, Stay, Cusp, Past are 47px and hit. Story Map, Theme, and Next are 47px, Next ends at 1263. Seven doors, 44px, two rows, no row scroll. Caption: “The orbit of 0 climbs to the north pole. The Julia set is dust.” Ask: “Where does the orbit of 0 go?” `data-xr-proof` is `untried`.

Climb at 390×844. Stage 390×292, header 144, footer 408, overlap 0, no sideways scroll. Chapter sentence starts, 72px under the first line. Chips are 44px, Past ends at 378. Header actions are 44px, Next is 44×44 and ends at 378. Doors are the short names, 44px, two rows, on the glass.

A touch on the left pane moved c from −1 + i√3 to about 0. The caption became “The orbit of 0 stays off the north pole. The Julia set is one piece.” The diary did not flash. Pinch, wheel, Enter, and Space left the Julia span at 2.6 and did not flash.

Light-theme join. The dash core is the page text ink, the rim is cart blue, and the polar ray is in the gaps. 88 dark samples, 64 blue, 180 orange, and columns that carry both.

Roots desktop. The chapter sentence has 146px under the first line. Stage 232. Overlap 0. Rays phone. 48px under the first line. Stage 292. Chips and actions 44px.

Real half-lines, phone overlay, the real-axis rows. Angle 0 ends 19px inside the right edge. Angle 1/2 ends 20px inside the left edge. The inset is `max(18px, 18 × scale)` at every width.

Still paint. Climb draws stayed 149 then 149. Rays stayed 980 then 980. `__pg.stop()` left the draw count there and removed `window.__pg`.

Story Map Next is paper, twin, bulbs, cascade, rays, pole, join, climb. The fractal smoke checks that chain. `#climb` opens while locked. The live boot graph does not import from `kit/`. `js/core/map-route.js` was not edited.

### Citations needing Shael

Unchanged from the pull request. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. The page also cites Figure 2.5.2 and Exercise 14 for the sphere and its coordinates. Confirm those against the book.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, and the sphere as the place a leaving orbit arrives.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 210/210. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the climb at 390 and at 1280, stay, cusp, the locked hash, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048`.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/close-l17-climb-1280.png`, `/opt/cursor/artifacts/close-l17-climb-390.png`, `/opt/cursor/artifacts/close-l17-climb-390-stay.png`, `/opt/cursor/artifacts/close-l17-climb-390-cusp.png`, `/opt/cursor/artifacts/close-l16-join-light-1280.png`, `/opt/cursor/artifacts/close-l15-pole-tip-390.png`, `/opt/cursor/artifacts/close-l15-pole-pair-390.png`, `/opt/cursor/artifacts/close-l15-pole-cusp-390.png`, `/opt/cursor/artifacts/close-l13-pile-1280.png`, `/opt/cursor/artifacts/close-l14-rays-390.png`, `/opt/cursor/artifacts/close-l9-roots-1280.png`.

### Residue for mid and wide

The join chip “i” is 47px tall and 35px wide. A tap hits it. It was left at that width.

Complex ray tails still leave the window. The pole is where they leave.

The long citations on roots and rays still scroll. The first line has the air claimed above: 146px on the roots desktop, 48px on the rays phone, 28px on the tip phone.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 26 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 210/210. Assembler sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #26 mid review

**ACCEPT WITH FIXES**

Mid is the site and Test 1. The climb is the next sentence after the join: the left pane is both addresses of one c, and the right pane is the fate of the orbit of 0 on the book’s sphere. The opening point stays −1 + i√3, so Next is one walk. A leaving walk arrives at the north pole. A staying walk never reaches it. The Julia set stays the door. The picture was already that sentence. Three lines on the glass were pointing at the wrong thing, and the walk between the steps was a chord through the ball.

### Fixed

The F2 badge says “Square, then slide.” The citation had said the set of c is the left pane. That pane is the ground. The rule is the step. The sentence now says square, then slide is that step plus c, the left pane is the set of those c, and the Julia set is the door, not a third pane. T2 stays, because each step of the orbit is drawn: the formula is z₀ = 0, zₙ₊₁ = zₙ² + c, and the dots are those steps. T1 stays for the two addresses. F1 stays for the fate on the sphere. F3 stays off. This picture is not which root.

The stroke between orbit points was a straight line on the screen, so it cut through the ball. The steps are now the short arc on the book’s sphere, and a leaving walk ends on that arc at the north pole. The fate word sits on the last finite point. On the cusp the second step is still near 0. The approach is the end of the walk.

The cusp caption and badge now say the orbit stays bounded, so the Julia set is one piece, and that this is not Settles. Exercise 8 is that cusp and the half-line past 1/4. Theorem 4.2.11 is one piece or dust at the cusp too.

The leaving badge had set Figure 2.5.2 and Exercise 14 next to the arrival, as if the book numbered that picture. Those two are the coordinates. The badge, the hint, the Story Map spine, and the screen-reader line now say the book does not number the sphere as the place a leaving orbit arrives. The keys line had stopped at the join. It now says the climb.

The unlock line told the learner to open one leaving point and one staying point. The first place only marks. The climb opens after the fate has changed twice, with 64 pictures remembered. The join hint and the waiting line say that.

### Decisions

T2 stays on. The staircase badge is the square, the same way the bulbs, the cascade, the rays, and the pole already use it. The join keeps T2 off, because that picture draws Arg and not the step.

F2 stays on the header and on the Story Map. The rule is on the glass, and the room is the next stop of the set of c. F2 is not a Julia pane here. The door is. The map line through the seven rooms is unchanged. `#climb` still opens while the assembler is locked. R28 still refuses a mandel map. Basin is still R1 and R29. Curvature is still R29. A pinch is still R5. The live boot graph does not import from `kit/`. `data-xr-proof` stays `untried`.

Figure 2.5.2 in the open-edition HTML is the Riemann sphere, and the north pole is infinity. Exercise 14, HTML id `x2_5_20`, is the coordinate triple the picture uses. The PDF pin, Figure 2.22 on printed page 73, was not re-opened. It stays for Shael. No number was invented. The polar form of −1 + i√3 stays unnumbered. Figure 1.4.1 and Definition 1.4.6 stay closed.

### Citations needing Shael

Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, and the sphere as the place a leaving orbit arrives.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 210/210. `node tools/fractal-smoke.mjs` exits 0. `node tools/playground-smoke.mjs` exits 0, including the climb at 390 and at 1280, stay, cusp, past, the locked hash, R28, R1 and R29, R29, R5, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048`.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Screenshots: `/opt/cursor/artifacts/mid-l17-climb-1280.png`, `/opt/cursor/artifacts/mid-l17-climb-390.png`, `/opt/cursor/artifacts/mid-l17-climb-stay-390.png`, `/opt/cursor/artifacts/mid-l17-climb-cusp-390.png`, `/opt/cursor/artifacts/mid-l17-climb-past-1280.png`.

### Residue for wide

The join chip “i” is 47px tall and 35px wide. A tap hits it.

Complex ray tails still leave the window. The pole is where they leave.

The long citations on roots and rays still scroll. The first line has the air close claimed: 146px on the roots desktop, 48px on the rays phone, 28px on the tip phone.

The phone sphere is the right half of a 390px stage. The fate word clears the point and the stroke. Wide can look at how tight that word sits against the arc.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 26 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 210/210. Assembler sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #26 wide review

Branch `cursor/playground-l17-climb-dd9c`, pull request 26, base `gh-pages`. Head at kickoff `4afe110`. Zoom: step back and watch the learner walk. Does L17 Climb, with the join residue from #25, hold together as one story? Verdict: **READY**. This pass does not merge and does not redeploy.

The paper’s Next is the twin, the bulbs, the cascade, the rays, the pole, the join, and the climb. That order is the lesson. The twin sets a neighborhood beside the Julia set it resembles. The bulbs name the period as the orbit of 0 and light that cycle on the Julia set. The cascade walks real c and asks what that orbit does as the periods double. The rays give one landing two addresses: c, and the angle. The pole is where those angles leave, one point, the north pole. The join makes the site’s name visible: one point, how far across and how far up, the length and Arg from the positive real axis, and the Julia set that point writes. The climb is the next sentence. The same point stays −1 + i√3. The left pane is still both addresses. The right pane is the fate of the orbit of 0 on the book’s sphere. A leaving walk arrives at the north pole, and the Julia set is dust. A staying walk never reaches the pole, and the Julia set is one piece. At the cusp the orbit approaches 1/2, stays bounded, and the Julia set is one piece. That is not Settles. The Julia set is the door. T2 stays, because each step is drawn. F2 names square-then-slide as that step plus c, and the left pane is the set of those c. F3 stays off. This picture is not which root.

### Fixed

On a phone the sphere is the right half of a 390px stage. The opening walk and the cusp drew no fate word. Stay did. A learner tapping Polar, then Stay, then Cusp saw the verb only on Stay. The caption still said the sentence. The picture did not.

The plate includes a 4px pad. The search clamped the word and then tested the plate, so a word that had to sit against the pane — “approaches” on the cusp, “climbs” past 1/4 — landed one pad outside and was dropped. The opening arc filled the first eight steps, so “climbs” on −1 + i√3 never reached the clear pocket under the ball. The clamp now keeps the pad inside the pane, and the search continues until the plate has left the pane. A label that already fit is still the first one found. On the wide pane “climbs” is the same plate as before this pass, from x = 861 to x = 918, with 8px of ink between the plate and the arc.

On the phone, after the fix: “climbs” on the opening walk sits under the sphere, 12px of ink from the arc. “stays” is the same plate as before, under the south point. “approaches” sits above the cluster at 1/2, 22px of ink from the arc. “climbs” past 1/4 sits above that arc, 5px of ink from it, and clear of the north-pole plate. None of the four sit on the point or the stroke. The cusp caption does not say Settles. The badge says this is not Settles.

### Decisions

The 5px of ink on the past-1/4 phone plate stays. It is the first pocket that clears the arc and the pole name. Moving it further would put the word on the pole plate or off the pane. The opening walk, which is the sentence the learner meets, has 12px.

T2 stays on. F2 stays on. F3 stays off. The join still keeps T2 off, because that picture draws Arg and not the step. The Story Map line is unchanged: paper, twin, bulbs, cascade, rays, pole, join, climb. `#climb` still opens while the assembler is locked, at level 0. R28 still refuses a mandel map. Basin is still R1 and R29. Curvature is still R29. A pinch is still R5. The live boot graph does not import from `kit/`. `data-xr-proof` stays `untried`.

Figure 2.5.2 and Exercise 14 stay the coordinates. The book does not number the sphere as the place a leaving orbit arrives. The polar form of −1 + i√3 stays unnumbered. Figure 1.4.1 and Definition 1.4.6 stay closed: PDF Figure 1.15, printed page 22, and PDF Definition 1.11, printed page 23. The PDF pin for the sphere, Figure 2.22 on printed page 73, was not re-opened. No number was invented.

### Citations needing Shael

Unchanged from mid. Howell & Mathews only. Nothing numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, and the sphere as the place a leaving orbit arrives.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 210/210. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, rays, pole, join, and climb. `node tools/playground-smoke.mjs` exits 0, including the climb at 390 and at 1280, stay, cusp, past, the locked hash, R28, R1 and R29, R29, R5, `data-xr-proof` untried, and the phone sphere naming climbs, stays, and approaches. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048`.

`films/shared/hostclock.js` and `js/core/anim.js` were not edited.

Headless Chrome. The eight rooms at 1280 open in Next order. Join threads are T1, F1, F2. Climb threads are T1, T2, F1, F2. The stage does not meet the footer. At 390 the four climb chips are 44px, the page does not scroll sideways, and the chapter sentence starts. A fresh `#climb` opens at level 0. The join draw count stayed at 1329 across 400ms, and `__pg.stop()` removed `window.__pg`. The i chip is 35×47. The rays phone citation has 48px under the first line and 67 lines. The tip phone citation has 28px under the first line. The pile badge still names period 32 as the birth inside the pile, not a tick.

Screenshots: `/opt/cursor/artifacts/wide-l17-twins-1280.png`, `/opt/cursor/artifacts/wide-l17-bulbs-1280.png`, `/opt/cursor/artifacts/wide-l17-cascade-1280.png`, `/opt/cursor/artifacts/wide-l17-rays-1280.png`, `/opt/cursor/artifacts/wide-l17-pole-1280.png`, `/opt/cursor/artifacts/wide-l17-join-1280.png`, `/opt/cursor/artifacts/wide-l17-joini-1280.png`, `/opt/cursor/artifacts/wide-l17-join-light-1280.png`, `/opt/cursor/artifacts/wide-l17-climb-polar-1280.png`, `/opt/cursor/artifacts/wide-l17-climb-cusp-1280.png`, `/opt/cursor/artifacts/wide-l17-climb-polar-390.png`, `/opt/cursor/artifacts/wide-l17-climb-stay-390.png`, `/opt/cursor/artifacts/wide-l17-climb-cusp-390.png`, `/opt/cursor/artifacts/wide-l17-climb-past-390.png`, `/opt/cursor/artifacts/wide-l17-pile-1280.png`, `/opt/cursor/artifacts/wide-l17-tip-390.png`, `/opt/cursor/artifacts/wide-l17-rays-390.png`.

### Residue

The join chip “i” is 47px tall and 35px wide. A tap hits it.

Complex ray tails still leave the window. The pole is where they leave.

The long citations on roots and rays still scroll. The rays phone has 48px under the first line. The tip phone has 28px. The rest of each citation scrolls inside the footer.

On the past-1/4 phone the word “climbs” has 5px of ink between the plate and the arc. It clears the point, the stroke, and the north-pole plate.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 26 was not merged. Nothing was redeployed.

**READY**

Vectors 210/210. Assembler sha256 `f2fb2c8644799c9080af20c836251b0124c578c082fc1ad30eeaee1639491048` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #27 close review

Branch `cursor/playground-l18-fall-c617`, pull request 27, base `gh-pages`. Head at kickoff `caed97cb8265db398eb1caada3788ff1c1b4db95`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen at about 390×844 and at 1280×800? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

On the roots picture, the rays picture, and the pole, the folded book line was pinned to the foot of the footer: `position: absolute`, `bottom: 1.75rem`, `z-index: 4`, with a solid plate. That plate sat on the lower door row and on the headset line. The smoke check only asks that the Story Map row starts above the citation, so Disk and Cardioid could be covered and the check still passed.

Before the fix, on the phone tip the second door row ran from y = 749 to y = 793 and the summary ran from y = 763 to y = 807. On the wide tip, Disk and Cardioid ran from y = 705 to y = 749 under a summary from y = 719 to y = 763. A tap on those doors hit “The book line”.

The footer on those three rooms is now a column. The formula, the chips, the badge, and the hint scroll inside `.foot-scroll`. The doors, the chapter sentence, and the headset line stay under that scroll, in that order, on the cusp and on the tip. Opening the disclosure scrolls inside the disclosure (`max-height: min(30vh, 9rem)`). The summary stays 44px tall.

After the fix, `elementFromPoint` on the centre and the four corners of each control:

- Roots, rays, and the pole, at 390 and at 1280: every door is the element under the point. The summary is 120×44 on the phone and 129×44 on the wide window, and it is the element under the point. The headset line is on the glass and is the element under the point.
- Air under the chapter sentence matches. Rays and the tip are both 87px at 1280 and both 108px at 390. The difference is 0. Both are above the 24px floor. Phone stage height for rays and for the tip is 292, inside 280–360. Wide stage height is 280. Roots stays 200 wide and 231 on the phone.
- The chapter sentence is still the first line: “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.”

### Checked and left as drawn

The join chip `i` is 47×47 on the wide window, with 11px to the next chip. On the phone it is 85×44, with 9px to the next chip. Both clear 44×44 and the 8px gap. A tap hits `i`.

On the climb, past 1/4, at 390, the sphere pane is 390×292. The word “climbs” is drawn at canvas x = 329.5, baseline y = 250.1, width 48.5. The plate is 24.1px from the nearest orange arc pixel. No orange pixel sits inside the plate. The word is off the stroke.

Complex ray tails stop inside an inset. On the pole tip (angle 0) and on the pair, the cut is an open ring. The ring is empty. A landing that stays inside the inset still has a filled dot. Real half-lines fade before the pane edge. Left as drawn.

The fall, at 390×844 and at 1280×800:

- Both panes are on the first screen. The stage is 313px on the phone and 280px wide. The footer does not cover the stage. The page does not scroll sideways.
- Chips 1, ω, 0, Far, 3, 4, and 5 are 44×44 on the phone and at least 47×47 wide. The gap is 9px. A tap hits each chip. The doors, Story Map, Theme, Next, and threads T1, T2, T3, and F3 are on the glass.
- Opening, Far, and zero are readable. Zero says the step breaks at 0. Far says the guess falls inward to a root. “not a root” and “step breaks” sit inside the canvas.
- A fresh `#fall` opens at level 0 while the assembler is locked. A wheel on the picture does not flash and does not leave the fall. Enter and Space stay with the picture. The pinch handler returns before a zoom.
- `data-xr-proof` stays `untried`. The page still says “No headset session. The shape stays in the void. A headset was not used to check this page.”

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, and Newton’s walk on this sphere. Equation 1.5.5 is the roots. Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^d − 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 221/221. `node tools/fractal-smoke.mjs` exits 0, including the eight rooms and the shipped route rule matching the kit helper. `node tools/playground-smoke.mjs` exits 0, including the fall at 390 and at 1280, the locked hash, the join chip, the past-1/4 phone plate, and the matching air under the rays sentence and the tip sentence. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`.

Headless Chrome, after the fix. Fall opening, Far, and zero at 390 and at 1280. Join `i` at 390 and at 1280. Climb past 1/4 at 390. Rays cusp and pair, pole tip and pair, and the roots picture, at the sizes above.

Screenshots: `/opt/cursor/artifacts/close-l18-fall-open-390.png`, `/opt/cursor/artifacts/close-l18-fall-far-390.png`, `/opt/cursor/artifacts/close-l18-fall-zero-390.png`, `/opt/cursor/artifacts/close-l18-fall-open-1280.png`, `/opt/cursor/artifacts/close-l18-fall-far-1280.png`, `/opt/cursor/artifacts/close-l18-fall-zero-1280.png`, `/opt/cursor/artifacts/close-l16-join-i-390.png`, `/opt/cursor/artifacts/close-l16-join-i-1280.png`, `/opt/cursor/artifacts/close-l17-climb-past-390.png`, `/opt/cursor/artifacts/close-l14-rays-390.png`, `/opt/cursor/artifacts/close-l14-rays-pair-1280.png`, `/opt/cursor/artifacts/close-l15-pole-tip-390.png`, `/opt/cursor/artifacts/close-l15-pole-tip-1280.png`, `/opt/cursor/artifacts/close-roots-390.png`, `/opt/cursor/artifacts/close-roots-1280.png`.

### Residue for mid and wide

On the fall, the join, and the climb, the headset line is in the page and below the first screen. The footer scrolls to it. On the roots picture, the rays picture, and the pole, that line is now on the glass. `data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

The climb chips sit 6px apart. The rays and pole chips sit 6px apart. Each chip is at least 44px and a tap hits it. The join chip `i` is the one this pass measured for a clear gap: 9px on the phone, 11px wide.

On the folded rooms the long badge and the hint scroll inside the footer. The doors stay put. Opening “The book line” scrolls inside the disclosure.

On the wide zero, “step breaks” sits just above the sphere circle. The glyphs are inside the canvas and readable. Mid can look at whether that plate should sit further off the ring.

The period-32 pile, the Story Map, and the pedagogy of the eight rooms were left for mid and wide.

Pull request 27 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 221/221. Assembler sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #27 mid review

Branch `cursor/playground-l18-fall-c617`, pull request 27, base `gh-pages`. Head at kickoff `cdbcbeaf89f7df99035406c52fd390eca4a14083`. Zoom: site tie-in and Test 1. Does the fall feel like the rest of One Point, Two Addresses? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

The fall is the eighth room. Next still runs twin, bulbs, cascade, rays, pole, join, climb, fall. The climb asks whether the orbit of 0 leaves, stays, or approaches the cusp. The fall asks which root a guess finds. Those are two questions. The doors stay Story Map, Newton, Roots, the derivative, and the sphere. `#fall` still opens at level 0. The unlock is still a change, on the climb, in whether the walk reaches the north pole, twice, with 68 pictures remembered.

### Fixed

The header had lit T1. T1 is two addresses, and on the roots picture a tap names the Cartesian pair. The fall does not draw two addresses. A tap moves the guess. T1 stays off. The header is T2, T3, and F3. T2 is the roots of 1 on the unit circle, length 1, equal steps, Equation 1.5.5. T3 is the derivative, Chapter 3, and the step breaks where the denominator is 0. F3 is which root. The colour is that answer. The left pane is the basins. The right pane is the same walk on the book’s sphere. F1 stays off. This is not leave, stay, or the cusp. F2 stays off. This is not square, then slide. The Story Map card for the fall stays F3 only.

The corner chips had said “the set of c” and “the Julia set”, because the fall reuses those frames. The glass now says “the basins” and “the sphere”.

The formula wrote the exponent as `d-1` inside the superscript, so degree 3 drew \(z^{3-1}\). The exponent is the integer \(d-1\). Degree 3 is \(3z^{2}\). The roots picture had already closed that miss.

On the wide zero, “step breaks” sat on the south of the circle. The south point is on that stroke, so a plate just under it lands on the ring when the ball fills the pane. The plate now sits under the ball when a line of air fits, and otherwise above the green ring, inside the ball, clear of the stroke. On the wide zero the glyphs end 42px above the south stroke and 16px above the green ring. On the phone the word sits under the ball, 21px below the south stroke.

### Decisions

The headset line stays below the first screen on the fall, the join, and the climb. Those three rooms keep the book line open. It is the new lesson, so the headset sentence is one scroll down, still in the page, still saying a headset was not used. Roots, rays, and the pole fold that line, so their headset stays on the glass, where close put it. Pulling the headset onto the first screen of the open rooms would cover a door or fold the lesson. `data-xr-proof` stays `untried`. No headset was used.

The climb chips, and the rays and pole chips, stay 6px apart. Each is at least 44px, and a tap hits it. Those rows already passed the wide review of pull request 26. The fall’s seven chips stay at the gap close measured, 9px, and at least 44px. The site’s rule is a tap a finger hits, not one gap for every row.

The fall’s book line stays open in the footer. Roots, rays, and the pole stay folded. “not a root” stays next to the pole. On the wide zero the top of that word meets the ring. The pole dot is the next mark down, and the name belongs there. Wide can look. I left it.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, and Newton’s walk on this sphere. Equation 1.5.5 is the roots. Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^d − 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 221/221. `node tools/fractal-smoke.mjs` exits 0, including the eight rooms and the shipped route rule matching the kit helper. `node tools/playground-smoke.mjs` exits 0, including the fall at 390 and at 1280, the basins and the sphere on the glass, T2, T3, and F3, the exponent \(z^{2}\), zero, Far, and the locked hash. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited.

Screenshots: `/opt/cursor/artifacts/mid-l18-fall-open-390.png`, `/opt/cursor/artifacts/mid-l18-fall-far-390.png`, `/opt/cursor/artifacts/mid-l18-fall-zero-390.png`, `/opt/cursor/artifacts/mid-l18-fall-open-1280.png`, `/opt/cursor/artifacts/mid-l18-fall-far-1280.png`, `/opt/cursor/artifacts/mid-l18-fall-zero-1280.png`.

### Residue for wide

The headset line is still below the first screen on the fall, the join, and the climb. That is the open book line. Roots, rays, and the pole keep it on the glass.

The climb chips, and the rays and pole chips, still sit 6px apart. The fall chips stay at 9px. The join chip `i` is the size close left: 47×47 wide, 85×44 on the phone.

On the wide zero, “step breaks” is inside the ball, 42px above the south stroke and 16px above the green ring. On the phone it is under the ball, 21px below the south stroke. “not a root” still meets the top of the ring.

The ray cuts on the pole tip and the pair are still open rings. Real half-lines still fade before the pane edge. The period-32 pile is still one pixel from the birth of 16.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 27 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 221/221. Assembler sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #27 wide review

Branch `cursor/playground-l18-fall-c617`, pull request 27, base `gh-pages`. Head at kickoff `8e3e9f72ed10909aaeb290410f99032adc0bac28`. Zoom: step back and watch the learner walk. Does L18 Fall, with the climb residue from #26, hold together as one story? Verdict: **READY**. This pass does not merge and does not redeploy.

The paper’s Next is the twin. Then the bulbs, the cascade, the rays, the pole, the join, the climb, and the fall. The playground assembler sits in the registry between the paper and the twin, and it is not a Next stop. The twin sets a neighborhood beside the Julia set it resembles. The bulbs name the period as the orbit of 0. The cascade walks real c and asks what that orbit does. The rays give one landing two addresses. The pole is where those angles leave, one point, the north pole. The join draws both addresses of one point, and the Julia set beside them. The climb puts the orbit of 0 on that same sphere: a leaving walk arrives at the north pole, and the Julia set is dust. The fall is the next sentence. The sphere stays. The question changes. Newton’s walk for the roots of 1 falls to a root, and the north pole is not a root. The left pane is the basins. The right pane is that walk. A tap on the left moves the guess, and the sphere follows. A tap on the sphere does not. T2, T3, and F3 stay. T1, F1, and F2 stay off.

### Fixed

On a 390px layout the fall’s doors were still the long names: Story Map, Newton Fractals: Which Root?, the roots door, the derivative door, and the sphere door. The short names are what the phone contract asks for, and the long ones are a second lesson under the question. `narrowDoors` was reading `window.innerWidth`. A device metric can leave that number on the wide window after the layout width is already the phone, and the resize that follows then writes the long names back. The layout width is `document.documentElement.clientWidth`, with the same media query the footer already uses. At 390 the doors are Map, Newton, Roots, Move, and Sphere. Each is 44px and is the element under the point. The question on that glass is “Which root does this guess fall to?”

### Decisions

The headset line stays one scroll down on the fall, the join, and the climb. Those rooms keep the book line open, and the line is the lesson. Roots, rays, and the pole fold it, and their headset stays on the glass. `data-xr-proof` stays `untried`. No headset was used.

The climb chips, and the rays chips, stay 6px apart. Each is at least 44px. The fall chips stay at 9 or 10px, and at least 44px. The join chip `i` is 47×47 on the wide window and 85×44 on the phone. A tap hits it.

“not a root” still meets the ring. On the wide window the plate meets the stroke. On the phone the plate is 3px inside it. The caption says the sentence, and the name belongs at the pole. The wide zero keeps “step breaks” inside the ball. The phone keeps it under the ball, the plate 16px below the south stroke. The ray cuts stay the open rings close recorded. Period 32 stays one pixel from the birth of 16. None of those block the walk.

The fall’s Story Map card stays F3 only. Lighting F3 leaves the fall up and dims the climb. Lighting F2 dims the fall and leaves the climb up. The fourth spine line still lists the fall, because that line is the Next walk after the paper, and the sentence there says the fall is Newton’s walk on the sphere the climb just used. F2 is not added to the room. This picture is not square, then slide.

Figure 2.5.2 and Exercise 14 stay the coordinates. Newton’s walk on this sphere stays unnumbered. Equation 1.5.5 is the roots. Figures 4.2.5 and 4.2.6 colour \(z^3 + 1\). This picture colours \(z^d - 1\). The polar form of \(-1 + i\sqrt{3}\) stays unnumbered. Figure 1.4.1 and Definition 1.4.6 stay closed: PDF Figure 1.15, printed page 22, and PDF Definition 1.11, printed page 23. The PDF was not opened. No number was invented.

### Citations needing Shael

Unchanged from mid. Howell & Mathews only. Nothing numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, and Newton’s walk on this sphere. Equation 1.5.5 is the roots. Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^d − 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 221/221. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through twin, bulbs, cascade, rays, pole, join, climb, and fall, and the shipped route rule matching the kit helper. `node tools/playground-smoke.mjs` exits 0 after the door fix, including the fall at 390 and at 1280, the locked hash, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Headless Chrome, 1280×800. The eight rooms open in Next order. Captions, in that order: the neighborhood resembles the Julia set beside it; the period is the orbit of 0; the real orbit of 0 splits; one landing, two addresses; both angles leave the north pole; one point, two addresses, and the Julia set beside them; the orbit of 0 climbs to the north pole and the Julia set is dust; the guess falls to a root and the north pole is not a root. Each question is on the glass. The stage does not meet the footer. Fall threads are T2, T3, and F3. A fresh `#fall` opens at level 0. The fall draw count stayed at 148 across 450ms. On the wide fall the question sits at y = 447 in an 800px window, under a 280px stage. The headset line starts at y = 954. On the join and the climb it is also below the window. On the rays and the pole it is on the glass, and “The book line” is 129×44 and is the element under the point.

At 390 the opening question is “Which root does this guess fall to?” The doors are the short names. The page does not scroll sideways. Far says the guess falls inward and does not land on the north pole. Zero asks why the step breaks, and the phone plate for “step breaks” is under the ball. A tap on the left pane changes the picture and returns the question to which root. A tap on the sphere leaves the picture. The join chip `i` is 47×47 wide and 85×44 on the phone. Climb chips on the past-1/4 phone are 44px and 6px apart. Rays chips are 6px apart.

Story Map. Next from the paper is the twin. The eight rooms follow, with the assembler skipped. The fall’s card says threads F3. F3 leaves the fall lit and dims the climb. F2 dims the fall. The map lede says the fall asks which root, on the sphere the climb just used.

Screenshots: `/opt/cursor/artifacts/wide-l18-twins-1280.png`, `/opt/cursor/artifacts/wide-l18-bulbs-1280.png`, `/opt/cursor/artifacts/wide-l18-cascade-1280.png`, `/opt/cursor/artifacts/wide-l18-rays-1280.png`, `/opt/cursor/artifacts/wide-l18-pole-1280.png`, `/opt/cursor/artifacts/wide-l18-join-1280.png`, `/opt/cursor/artifacts/wide-l18-climb-1280.png`, `/opt/cursor/artifacts/wide-l18-fall-1280.png`, `/opt/cursor/artifacts/wide-l18-fall-open-1280.png`, `/opt/cursor/artifacts/wide-l18-fall-far-1280.png`, `/opt/cursor/artifacts/wide-l18-fall-zero-1280.png`, `/opt/cursor/artifacts/wide-l18-fall-open-390.png`, `/opt/cursor/artifacts/wide-l18-fall-far-390.png`, `/opt/cursor/artifacts/wide-l18-fall-zero-390.png`, `/opt/cursor/artifacts/wide-l18-join-i-1280.png`, `/opt/cursor/artifacts/wide-l18-join-i-390.png`, `/opt/cursor/artifacts/wide-l18-climb-past-390.png`, `/opt/cursor/artifacts/wide-l18-rays-fold-1280.png`, `/opt/cursor/artifacts/wide-l18-spine-1280.png`, `/opt/cursor/artifacts/wide-l18-map-fall-1280.png`.

### Residue

The headset line is still below the first screen on the fall, the join, and the climb. Roots, rays, and the pole keep it on the glass.

The climb chips, and the rays and pole chips, still sit 6px apart. The fall chips stay at 9 or 10px. The join chip `i` is 47×47 on the wide window and 85×44 on the phone.

“not a root” still meets the top of the ring. On the wide window the plate meets the stroke. On the phone it is 3px inside. On the wide zero, “step breaks” stays inside the ball. On the phone it stays under the ball.

The ray cuts stay open rings. Real half-lines still fade before the pane edge. The period-32 pile is still one pixel from the birth of 16.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 27 was not merged. Nothing was redeployed.

**READY**

Vectors 221/221. Assembler sha256 `1ac6353e3579adbad9668989b66e7334b4631668b14b66be40dc19f7b9d771bc` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #28 close review

Branch `cursor/playground-l19-lean-89f6`, pull request 28, base `gh-pages`. Head at kickoff `2a2e4d1d1e2040d1df1462e173c7dda83768eece`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen at about 390×844 and at 1280×800? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

The lean fractal canvas was only the left column of the split. The basins occupied half the stage, and the sphere ring was drawn on the starfield beside them. A tap and the picture disagreed. The lean canvas now covers the stage, the same way the fall does. At 1280 the stage is 1280×280. At 390 it is 390×292. The footer starts where the stage ends.

The lean chip row started under the two-line formula and ran about three pixels past the scroll, so the lower edge of a tap hit the door. The row now sits on the formula. On the phone, five names at the wide padding wrapped Far onto a second line that started under the scroll. The phone row is one line, the padding is shorter, every chip is still a 44px tap, and the gap is 13px so a rounded left-minus-right still clears 12. Far is on that row (45×44 at 390, inside the scroll). Equal, Lean, Line, and Break are on it too. The same row stays inside the scroll when c = 1 and the question names z³ − 1.

The formula writes 1, 1/2, and 0. A decimal 0.5 is the same value and the wrong name. The equal question says the polynomial is z³ − 1. That sentence was already in the badge. No new book number.

The period-32 triangle is 10px wide. Clearing the apex by 16px left the near corner about 13px from the birth of 16. The near corner is the mark. On a 640px pane the true place is x = 170.3, the birth of 16 is x = 172.4, and the triangle’s near corner is x = 154.3, which is 18px clear of that birth. The hairline still runs from the triangle to the true c. The “16” numeral had been shifted left, so it sat on the triangle and read as the name of the period-32 mark. It now sits on its own tick, one row up. The hairline does not run through the glyphs. Period 32 is still not its own tick. No Feigenbaum number was added.

On a long page, a shrink from the wide window to the phone could leave the wide door names up. The media-query lists are kept, so a long run does not drop the listener. The resize handler fits the doors before it repaints the stars. The document width fits them again when the stage changes size. At 390 the fall doors are Map, Newton, Roots, Move, and Sphere.

### Checked and left as drawn

Headset line. On the lean, at 1280 the line ends at y = 789 in an 800px window and is the element under the point. At 390 it ends at y = 833 in an 844px window and is the element under the point. The fall, the join, and the climb were measured on the glass before this pass, and the fall was measured again after it. `data-xr-proof` stays `untried`. No headset was used.

Chips. Rays, the pole, the climb, the join, and the fall keep the shared 12px gap and a 44px tap. The join letter `i` is 44×44 at 1280 and at 390. The lean phone row is the 13px gap above. The cascade row stays on its tighter gap. Four names do not fit a 12px gap on a 390px row.

Labels. On the lean break, wide ring centre (960, 140), radius 92.7. “not a root” baseline y = 31.1, about 12px above the ring. “step breaks” baseline y = 259.7, about 12px below it. The phone ring is (292.5, 146), radius 82.3. “not a root” y = 47.5. “step breaks” y = 255.3. The wide fall at zero matches the wide lean break. Neither label sits in the stroke.

The lean at both sizes. Both panes are on the first screen. c = 1/2 is the opening formula, and the caption says the roots lean. c = 1 names z³ − 1, the formula is c = 1, and the caption says the roots are equally spaced. The north pole is named in that caption. Threads on the glass are T2, T3, and F3. A wheel, Enter, and Space stay on the picture and leave c at 1/2.

Hash and Next. `#lean` opens the room at level 0 while the assembler is locked. Next’s nine rooms are twin, bulbs, cascade, rays, pole, join, climb, fall, lean. The fractal smoke checks that list.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The equal question uses z³ − 1, which is the sentence the badge already gives for Equation 1.5.5 at c = 1.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 223/223. `node tools/fractal-smoke.mjs` exits 0, including the nine rooms and the shipped route rule matching the kit helper. `node tools/playground-smoke.mjs` exits 0, including the lean at 390 and at 1280, the fall at 390 and at 1280, the locked hashes, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Screenshots: `/opt/cursor/artifacts/close-l19-lean-1280.png`, `/opt/cursor/artifacts/close-l19-lean-390.png`, `/opt/cursor/artifacts/close-l19-lean-equal-1280.png`, `/opt/cursor/artifacts/close-l19-lean-equal-390.png`, `/opt/cursor/artifacts/close-l19-lean-break-1280.png`, `/opt/cursor/artifacts/close-l19-lean-break-390.png`, `/opt/cursor/artifacts/close-l18-fall-open-390.png`, `/opt/cursor/artifacts/close-l18-fall-zero-1280.png`, `/opt/cursor/artifacts/close-l18-fall-zero-390.png`, `/opt/cursor/artifacts/close-l13-pile-1280.png`.

### Residue for mid and wide

The cascade chip gap stays about 6px. A 12px gap does not fit four names on a 390px row. The cascade footer is not the folded book line, so the headset line and the phone doors on that room sit below the first screen. Join, climb, fall, and the lean keep the headset on the glass.

Ray cuts still fade before the edge. The true place of period 32 is still about two pixels from the birth of 16. The drawn mark is 18px clear, and the hairline meets the true place. The book does not number that birth.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

Pull request 28 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 223/223. Assembler sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #28 mid review

Branch `cursor/playground-l19-lean-89f6`, pull request 28, base `gh-pages`. Head at kickoff `1a87f22679af1ef03492057e0fb5345edbee35fb`. Zoom: site tie-in and Test 1. Does the lean feel like the rest of One Point, Two Addresses? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

The lean is the ninth room. Next still runs twin, bulbs, cascade, rays, pole, join, climb, fall, lean. `#lean` still opens at level 0 while the assembler is locked. The unlock is still a change, on the fall, of which root the walk finds, twice, with 72 pictures remembered. The doors stay Story Map, Newton, Roots, the derivative, and the sphere. On a phone those names are Map, Newton, Roots, Move, and Sphere. The Story Map card stays F3. The fall’s card stays F3. T1 stays off. A tap moves the guess, and the picture does not draw two addresses. F1 stays off. This is which root, and the climb’s question is leave, stay, or the cusp. F2 stays off. These panes are the basins and the sphere, and the step is not square, then slide.

### Fixed

The header had lit T2 on every lean state. T2 is equal steps on the circle, Equation 1.5.5, the roots of 1. The fall is always that staircase, so the fall keeps T2, T3, and F3. The lean is that staircase only at c = 1, when the polynomial is z³ − 1. The opening is c = 1/2. The roots are 1 and −1/2 ± i/2, and they lean. The header there is T3 and F3. At c = 0 the roots are −1, 0, and 1, on a line, and the header is T3 and F3. A chip that changes c repaints the badges in the same turn. T3 is the derivative, Chapter 3. The step breaks where p′(z) is zero. At c = 1 that place is 0. It moves when c moves. A break at c = 1 keeps T2, because the roots are still equally spaced and the question has changed to why the step breaks. A break at c = 1/2 or at c = 0 does not wear the staircase.

The book line had led with the staircase, as if the lean were the fall. It now leads with F3 and T3, which are on the glass in every state. F3 is which root. The left pane is the basins of (z−1)(z²+z+c). The right pane is the same walk on the book’s sphere. The staircase sentence stays, and it says Equation 1.5.5 is this picture only when c = 1, and the badge is on only then. Figures 4.2.5 and 4.2.6 still colour z³ + 1. Example 4.2.1 is still z² + 1. The cubic stays unnumbered. Newton’s walk for it on the sphere stays unnumbered.

The map lede had said the lean asks the same question as the fall. The fall asks which root of z^d − 1. The lean asks which root once the roots of (z−1)(z²+z+c) leave that equal spacing. At c = 1 the polynomial is z³ − 1. At c = 1/2 the roots lean. The north pole is still not a root. The spine says the same. The Roots door stays on the row when the badge is off. Its title says Equation 1.5.5 is this cubic at c = 1, and the book does not number the other values. Taking the door off would hide the comparison with the fall.

### Decisions

The cascade stays as close left it. The four chips are 44px taps. The row gap is 0.35rem, about 6px. A 12px gap does not fit those four names on a 390px row without a scroll, and the page requires the four names without one. The rule from the fall’s mid review stands: a tap a finger hits, not one gap for every row. The cascade citation is the lesson. It names the births, and it says the book does not number the cascade. That line stays open, so the headset sentence and the long door names sit one scroll down. The header still has Story Map, Theme, and Next on the glass. Folding the cascade to match the lean would hide the births. Ray cuts still fade before the edge. The true place of period 32 stays about two pixels from the birth of 16. The drawn mark stays 18px clear. No headset was used. `data-xr-proof` stays `untried`.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The moving critical point is the same unnumbered cubic. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23. The pull request body had still asked for those two pages to be opened. They stay closed. The open list is the one below.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 223/223. `node tools/fractal-smoke.mjs` exits 0, including the nine rooms, the lean card on F3, the cubic left unnumbered, and the map no longer calling the lean the fall’s question. `node tools/playground-smoke.mjs` exits 0, including the lean opening on T3 and F3, Equal lighting T2, Line dropping it, a break away from c = 1 staying on T3 and F3, a break at c = 1 keeping T2, and the phone doors Map, Newton, Roots, Move, Sphere. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Screenshots: `/opt/cursor/artifacts/mid-l19-lean-1280.png`, `/opt/cursor/artifacts/mid-l19-lean-390.png`, `/opt/cursor/artifacts/mid-l19-lean-equal-1280.png`, `/opt/cursor/artifacts/mid-l19-lean-equal-390.png`, `/opt/cursor/artifacts/mid-l19-lean-break-1280.png`, `/opt/cursor/artifacts/mid-l19-lean-break-390.png`, `/opt/cursor/artifacts/mid-l19-lean-book-1280.png`, `/opt/cursor/artifacts/mid-l19-map-1280.png`, `/opt/cursor/artifacts/mid-l19-map-lean-1280.png`.

### Residue for wide

The cascade chip gap stays about 6px. The cascade headset line and the long phone doors sit below the first screen. Story Map, Theme, and Next stay on that room’s header.

Ray cuts still fade before the edge. The true place of period 32 is still about two pixels from the birth of 16. The drawn mark is 18px clear, and the hairline meets the true place. The book does not number that birth.

A break at c = 1 wears T2. The roots are still the cube roots of 1, and the question is why the step breaks. The book line says the badge is on only then. That sentence sits inside the folded line.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

Pull request 28 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 223/223. Assembler sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #28 wide review

Branch `cursor/playground-l19-lean-89f6`, pull request 28, base `gh-pages`. Head at kickoff `8abe0b8f20f5713817f6bad4891a3f57d395130f`. Zoom: step back and watch the learner walk. Does L19 Lean, with the fall residue from #27, hold together as one story? Verdict: **READY**. This pass does not merge and does not redeploy. No product file changed.

The paper’s Next is the twin, and that link lands on the playground. Then the bulbs, the cascade, the rays, the pole, the join, the climb, the fall, and the lean. The assembler sits in the registry between the paper and the twin, and it is not a stop on that walk. The captions, in that order, are one sentence. A neighborhood of c resembles the Julia set beside it. The period of a bulb is the orbit of 0. Along the real line that orbit splits. One landing has two addresses. Both angles leave the north pole. The join draws both addresses, and the Julia set of that point sits beside them. The climb puts the orbit of 0 on that sphere: a leaving walk arrives at the north pole, and the Julia set is dust. The fall keeps the sphere and changes the question. Newton’s walk for the roots of 1 falls to a root, and the north pole is not a root. Those roots are equally spaced, so the header wears T2. The lean is the next sentence. The same walk, once `(z−1)(z²+z+c)` leaves that spacing. The opening is `c = 1/2`. The header is T3 and F3. Equal returns to `c = 1`, the polynomial is `z³ − 1`, and T2 comes back in that same turn.

### Decisions

The first screen asks the question. At 1280 and at 390 the caption is “The roots lean off equal spacing. The north pole is not a root.” The line under the picture is “Which root does this guess fall to, once the roots lean?” Both are on the glass, above the chips. The left pane is the basins. The right pane is that walk on the book’s sphere. “not a root” sits over the pole. A tap on the left moves the guess. The chips are the sentence’s three values of c, plus the break and a far guess. On a phone they stay one row, 44px, gaps 12 to 14, and the doors are Map, Newton, Roots, Move, and Sphere. A tap hits each door. The headset line is on the glass and still says a headset was not used. The picture is the walk, split across two panes, and the question is the first line under it. That is clear.

Equal, Line, and Break were clicked and read in the same turn as the click. Equal lights T2, T3, and F3 and names `z³ − 1`. Line stays on T3 and F3 and says the three roots sit on a line. A break at `c = 1/2` or at `c = 0` stays on T3 and F3, and the question becomes why the step breaks. A break at `c = 1` keeps T2. The roots are still the cube roots of 1. The question on that glass is why the step breaks, and the caption says the step breaks. The staircase badge is the spacing, not the break. The book line says Equation 1.5.5 is this picture only at `c = 1`, and that the badge is on only then. I left the badge on. Taking it off would pretend the roots had moved.

The Story Map card for the lean is F3. The fall’s card is F3. Lighting F3 leaves both up and dims the climb and the twin. Lighting F2 dims the lean and the fall and leaves the climb and the twin up. The lede says the fall asks which root of `z^d − 1`, and the lean asks which root once `(z−1)(z²+z+c)` leaves that equal spacing. The fourth spine line still lists both rooms, because that line is the Next walk after the paper. The sentences there keep the two questions apart. F2 is not added to either room.

`#lean` opens the room with the assembler at level 0. The kicker says L19 because that is the picture’s name. The unlock is still two changes, on the fall, of which root the walk finds, with 72 pictures remembered. The vectors still say so. A fresh hash does not spend that unlock. T1, F1, and F2 stay off. The live router does not import from `kit/`. `js/core/map-route.js` is byte-identical to the kit helper.

On the lean, after the picture had settled, the draw count stayed at 160 across 700ms. The still paint stops the clock. `data-xr-proof` is `untried` on every room of the walk. No headset was used.

The cascade was measured and left. Four chips, gaps 6, 6, and 6. The question is on the glass. At 390 the doors are the short names, Map through Cardioid, on two rows, and they sit on the glass. The headset line starts at y = 1327 in an 844px window, inside the footer scroll. Widening the chip gap would scroll the four names, and the page requires those names on one row. Ray cuts still fade before the edge. The true place of period 32 stays about two pixels from the birth of 16. The drawn mark stays 18px clear. None of that blocks the walk.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.

### Checked

`node tools/check_vectors.mjs` is 223/223. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through the nine rooms, the lean card on F3, and the shipped route rule matching the kit helper. `node tools/playground-smoke.mjs` exits 0, including T2 only at c = 1 and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Headless Chrome, 1280×800. The nine rooms open in Next order. Each question is on the glass. The stage meets the footer and does not run under it. Fall threads are T2, T3, and F3. Lean threads are T3 and F3. A fresh `#lean` opens at assembler level 0. On the wide lean the question is under a 280px stage. The headset line ends at y = 789 in an 800px window. On the fall it does the same. At 390 the opening question is “Which root does this guess fall to, once the roots lean?” The doors are the short names. The page does not scroll sideways. Equal names z³ − 1 and lights T2. A break at c = 1 keeps T2 and asks why the step breaks. A break at c = 1/2 and a break at c = 0 do not light T2.

Story Map. Next from the paper is the twin. The nine rooms follow, with the assembler skipped. The lean’s card says threads F3.

Screenshots: `/opt/cursor/artifacts/wide-l19-twins-1280.png`, `/opt/cursor/artifacts/wide-l19-bulbs-1280.png`, `/opt/cursor/artifacts/wide-l19-cascade-1280.png`, `/opt/cursor/artifacts/wide-l19-rays-1280.png`, `/opt/cursor/artifacts/wide-l19-pole-1280.png`, `/opt/cursor/artifacts/wide-l19-join-1280.png`, `/opt/cursor/artifacts/wide-l19-climb-1280.png`, `/opt/cursor/artifacts/wide-l19-fall-1280.png`, `/opt/cursor/artifacts/wide-l19-lean-1280.png`, `/opt/cursor/artifacts/wide-l19-lean-equal-1280.png`, `/opt/cursor/artifacts/wide-l19-lean-break-1280.png`, `/opt/cursor/artifacts/wide-l19-lean-book-1280.png`, `/opt/cursor/artifacts/wide-l19-lean-390.png`, `/opt/cursor/artifacts/wide-l19-lean-equal-390.png`, `/opt/cursor/artifacts/wide-l19-lean-break-390.png`, `/opt/cursor/artifacts/wide-l19-fall-390.png`, `/opt/cursor/artifacts/wide-l19-map-1280.png`, `/opt/cursor/artifacts/wide-l19-map-lean-1280.png`.

### Residue

The cascade chip gap stays about 6px. At 390 the doors are the short names and they sit on the glass. The headset line on that room starts below the window, inside the footer scroll. Story Map, Theme, and Next stay on the header.

Ray cuts still fade before the edge. The true place of period 32 is still about two pixels from the birth of 16. The drawn mark is 18px clear, and the hairline meets the true place. The book does not number that birth.

A break at c = 1 wears T2. The roots are still the cube roots of 1, and the question is why the step breaks.

No headset was used. `data-xr-proof` is `untried`. A green smoke run is not a headset session.

Pull request 28 was not merged. Nothing was redeployed.

**READY**

Vectors 223/223. Assembler sha256 `5284880f643d45f0a2c15056507f2aa065bf1c03ac1d2aa6d3f653c580b57818` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #29 close review

Branch `cursor/playground-l20-warp-59ed`, pull request 29, base `gh-pages`. Head at kickoff `48a264e8ba7484f7f331d1b65df990d45925585e`. Zoom: controls and layout. Does the learner reach every control, and does anything overlap, clip, or sit one scroll below the first screen at about 390×844 and at 1280×800? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

### Fixed

The warp formula used the chordal display pair. That pair is about a hundred pixels, and the distance sentence then started under the door row. The warp now writes the same two lines in text style. At 390 the lift is 183px wide and the distance fraction is 92px wide, both inside the 366px formula. The sentence under the chips is the numbers: distance to 0, distance to the pole, and the area scale, plus the line that no exercise numbers the distance or the area scale. Figure 2.5.2, Exercise 14, the curvature 4, and Chapter 9 stay in the folded book line and in the hint. At 390 the chips sit at y = 531, each 44px, gaps 12, 12, and 12. The doors are Map, Sphere, Length, and 4D, top 645, and the stage ends at 436. At 1280 the stage is 280px, the same four chips have gaps 12, and the headset line ends at y = 789 in an 800px window. A tap on the chart changes the three numbers. The sphere follows that same point.

On a phone the cascade plate is at least 128px wide, and the pane name “the real orbit” occupies the top-left. A top-right plate covered that name. On a narrow pane the plate now sits under the name and under the ratio, above the birth numerals. A wide pane still has the room, and the plate stays at the top-right. The ticks on the line stay at the true parameters. Period 32 is still inside the pile, so it is still not a tick. The hairline still meets the true c.

A device metric can update the stage box a task before `resize`. The fall was built at 1280 and then set to 390. The stage was already 390px, phase idle, and the doors were still Story Map, Newton Fractals, and the long Test 1 names. Measuring the stage applies the short names before the next read. After that read the fall doors are Map, Newton, Roots, Move, and Sphere.

### Checked and left as drawn

Cascade chips. At 390 the four chips are 44px and the gaps are 12, 12, and 12. The stage is 326px and meets the footer. The door row starts at y = 596. The chapter sentence starts “Test 1 is Chapters 1 to 3.” The book line is folded. The headset line ends at y = 833 in an 844px window and says the shape stays in the void and a headset was not used.

Lean. A break at c = 1 keeps T2, T3, and F3. The roots stay the cube roots of 1. The question is why the step breaks, and the caption says the step breaks. The cite says the staircase stays because the roots stay. The badge was left on.

Warp gestures. A wheel leaves the picture. Enter and Space leave the picture. Pinch is refused. `#warp` opens the room at assembler level 0. Threads on the glass are T1. `data-xr-proof` stays `untried`.

Next. The ten rooms run twin, bulbs, cascade, rays, pole, join, climb, fall, lean, warp. The warp card is T1, and the distance stays unnumbered.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. The warp flag on the glass is the same sentence as the book line: no exercise numbers the distance, and no exercise numbers the area scale.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened. The radius on that figure is 1/2, so the curvature on the page is 4. Chapter 9’s introduction is the sentence about angles. The course map stops before Chapter 9.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.
- The warp’s chordal distance, the area scale, and a numbered exercise for the curvature. Those three stay unnumbered on purpose. The page says so.

### Checked

`node tools/check_vectors.mjs` is 225/225. `node tools/fractal-smoke.mjs` exits 0, including the ten rooms and the warp card on T1 with the distance left unnumbered. `node tools/playground-smoke.mjs` exits 0, including the cascade at 390, the warp at 390 and at 1280, a hash `#warp` at level 0, a break at c = 1 keeping T2, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Screenshots: `/opt/cursor/artifacts/close-l20-warp-390.png`, `/opt/cursor/artifacts/close-l20-warp-1280.png`, `/opt/cursor/artifacts/close-l13-cascade-390.png`, `/opt/cursor/artifacts/close-l13-cascade-1280.png`, `/opt/cursor/artifacts/close-l13-pile-390.png`, `/opt/cursor/artifacts/close-l13-pile-1280.png`.

### Residue for mid and wide

Ray cuts still fade before the edge. The true place of period 32 is still about two pixels from the birth of 16. The plate separates them. The hairline meets the true place. The book does not number that birth.

A break at c = 1 wears T2. The roots are still the cube roots of 1, and the question is why the step breaks.

The warp formula is text style so the distance sentence fits on the first screen. The chordal room still uses the display pair. The book paragraph sits in the folded line and in the hint.

On a phone the cascade plate covers the middle of the diagram so the pane name, the ratio, and the birth numerals stay readable. On a wide pane the plate stays at the top-right.

A hash change without a reload does not switch rooms. `#warp` on a fresh load does.

The cascade hint still scrolls inside the footer. The question, the chips, the chapter sentence, the book-line button, the doors, and the headset line are on the glass.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

Pull request 29 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 225/225. Assembler sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #29 mid review

Branch `cursor/playground-l20-warp-59ed`, pull request 29, base `gh-pages`. Head at kickoff `ebbcd1e33974867c579051b3b2d71e7412db9ec0`. Zoom: site tie-in and Test 1. Does the warp feel like the rest of One Point, Two Addresses? Verdict: **ACCEPT WITH FIXES**. This pass does not merge and does not redeploy.

The warp is the tenth room. Next still runs twin, bulbs, cascade, rays, pole, join, climb, fall, lean, warp. `#warp` still opens at assembler level 0 while the unlock stays `warps >= 2` and `history >= 76` on the lean. The header wears T1 only. The doors are Story Map, the sphere, length, and the 4D graph. On a phone those names are Map, Sphere, Length, and 4D.

### Fixed

A room hash was read only when the page loaded. The index switches stations in the same turn as the hash. A playground hash is that kind of door. Changing `#lean` to `#warp` while the page was already open left the lean on the glass under the warp’s name. The page now opens the named room in that turn. An unknown hash is not a room, so the assembler’s own walk stays. A fresh `#warp` still opens at assembler level 0. The switch does not spend the unlock. A bake that the next room supersedes does not roll the old picture back on top.

T1’s name is one point, two addresses. On the join that is the Cartesian pair and the polar pair. On the warp the two places are the chart and the sphere. The badge still says T1, because that is the thread. The title and the book line say the Cartesian and polar pair is the join, and this picture does not draw that pair. F2 would mean square, then slide. This picture does not iterate. F3 would mean which root. T2 would mean the argument staircase. The rings are chordal circles, not argument steps. T3 would mean the derivative. Chapter 9 says the projection keeps angles, and the picture does not show that move, and the course map stops before Chapter 9. F1 would mean a sequence’s fate. There is no orbit. Those badges stay off.

The other rooms open Test 1 from the footer Story Map, and an F badge returns to the card. This card is not on Test 1. The footer Story Map on the warp opens the Test 2 map, where the card is the tenth room, part J, after the lean. The T1 badge still opens the Test 1 address line. Its title says this card is not a stop on that line.

The chip for 1 put Exercise 14 beside the distance 1/√2. Exercise 14 is the coordinates. No exercise numbers the distance. The origin chip put Figure 2.5.2 beside the area scale. The figure is the sphere. No exercise numbers the scale. The accessible names now say so.

The hint had Figure 2.5.2, Exercise 14, and the curvature 4, and it did not name Chapter 9 or Exercise 2. The rings on the chart are the circles Exercise 2 asks about. Chapter 9’s introduction is the sentence about angles, and the course map stops before that chapter. Both sentences are in the hint and in the folded book line.

The Test 2 map draws F1, F2, and F3. T1 is not one of those lines, so the warp card has no dot on them. The lede, the fourth spine line, and the card summary say so. A dot on F2 would call this picture square, then slide.

### Decisions

The chordal room keeps the display pair. The two lines are the same formula. The warp writes them in text style so the distance sentence stays on the first screen. The chordal picture is the assembler metric. Its footer is not this folded Story Map room.

The cascade plate stays where close put it. On a phone it sits under the pane name and under the ratio, above the birth numerals. A corner plate covered the name. On a wide pane the plate stays at the top-right. The orbit’s splits stay readable beside the plate. Covering the middle of a narrow pane is how the two births stay apart. The book does not number either birth.

Period 32’s true place stays about two pixels from the birth of 16. The ticks stay at the true parameters. Period 32 stays inside the pile, so it is not a tick. The plate separates the two places, and the hairline meets the true c. The badge says so.

A break at c = 1 keeps T2. The roots stay the cube roots of 1. The question is why the step breaks. The badge says the staircase stays. The fall wears T2 for those same roots. Taking the badge off would pretend the roots had moved.

Ray cuts still fade before the edge. The fade is the cut. An open ring is not a landing. The pole uses the same mark. The book does not number where a ray lands.

The cascade hint still scrolls inside the footer. The question, the chips, the chapter sentence, the book line, the doors, and the headset line are on the glass.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened. The radius on that figure is 1/2, so the curvature on the page is 4. Chapter 9’s introduction is the sentence about angles. The course map stops before Chapter 9.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.
- The warp’s chordal distance, the area scale, and a numbered exercise for the curvature. Those three stay unnumbered on purpose. The page says so.

### Checked

`node tools/check_vectors.mjs` is 225/225. `node tools/fractal-smoke.mjs` exits 0, including the ten rooms and the warp card on T1 with the distance left unnumbered. `node tools/playground-smoke.mjs` exits 0, including the warp at 390 and at 1280, a hash `#warp` at level 0, a hash change from the warp to the lean and back in the same turn, an unknown hash leaving the open room, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Screenshots: `/opt/cursor/artifacts/mid-l20-warp-1280.png`, `/opt/cursor/artifacts/mid-l20-warp-390.png`, `/opt/cursor/artifacts/mid-l20-warp-book-1280.png`, `/opt/cursor/artifacts/mid-l20-hash-lean-1280.png`, `/opt/cursor/artifacts/mid-l20-map-1280.png`.

### Residue for wide

Ray cuts still fade before the edge. The fade is the cut, and an open ring is not a landing. The book does not number where a ray lands.

Period 32’s true place is still about two pixels from the birth of 16. The plate separates them. The ticks stay at the true parameters. The book does not number that birth.

On a phone the cascade plate covers the middle of the diagram so the pane name, the ratio, and the birth numerals stay readable. On a wide pane the plate stays at the top-right.

The cascade hint still scrolls inside the footer. The question and the doors are on the glass.

A break at c = 1 wears T2. The roots are still the cube roots of 1.

The chordal room still uses the display pair. The warp uses the same two lines in text style.

The warp card has no dot on the Test 2 map. The three lines are F1, F2, and F3, and this picture is none of them.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

Pull request 29 was not merged. Nothing was redeployed.

**ACCEPT WITH FIXES**

Vectors 225/225. Assembler sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233` for both `js/playground/playground.js` and `tools/playground.js`.

## PR #29 wide review

Branch `cursor/playground-l20-warp-59ed`, pull request 29, base `gh-pages`. Head at kickoff `76fcd449b21331da32cd83feaf32cbbdda533cdc`. The distance sentence at the origin is `eae07d980f4912e1a8282bf6bf4b55870a6cf872`. Zoom: step back and watch the learner walk. Does L20 Warp, with the cascade and lean residue from close and mid, hold together as one story? Verdict: **READY**. This pass does not merge and does not redeploy.

The paper’s Next is the twin, and that link lands on the playground. Then the bulbs, the cascade, the rays, the pole, the join, the climb, the fall, the lean, and the warp. The warp has no Next after it. The assembler sits in the registry between the paper and the twin, and it is not a stop on that walk. The captions, in that order, are one sentence. A neighborhood of c resembles the Julia set beside it. The period of a bulb is the orbit of 0. Along the real line that orbit splits. One landing has two addresses. Both angles leave the north pole. The join draws both addresses, and the Julia set of that point sits beside them. The climb puts the orbit of 0 on the book’s sphere: a leaving walk arrives at the north pole. The fall keeps the sphere and changes the question. Newton’s walk for the roots of 1 falls to a root, and the north pole is not a root. The lean is the same walk once `(z−1)(z²+z+c)` leaves that spacing. The warp is the next sentence. It is the metric those three rooms walked and did not draw: one point, on the chart and on that same sphere. The opening is `z = 1`. The header wears T1 only. F2, F3, T2, and T3 stay off.

### Fixed

The origin chip is where the wash is heaviest. Distance to 0 there is 0, the distance to the pole is 1, and the area scale is 1. The sentence was printing the zero as `0.00e+0`. That is the same value in a debugger’s voice, on the chip a learner presses to see the stretch at full strength. A distance of zero now reads as 0. The chordal room uses the same words when the two points are the same point, and it says 0 there too.

### Decisions

The first screen asks the question. At 1280 the stage is 280px and meets the footer. The caption is “One point, on the chart and on the sphere.” The line under the picture is “Where does this point sit on the sphere?” The two lines under that are the lift and the chordal distance, in text style. The sentence under the chips is “Distance to 0 is 0.707. Distance to the pole is 0.707. The area scale is 0.25. No exercise numbers the distance or the area scale.” The wash is the stretch: the centre of the chart is the full blue of scale 1, a point out along the disk is nearly the night colour, and the corners are orange. At 390 the same question, the same two lines, and the same sentence sit on the glass. The doors are Map, Sphere, Length, and 4D. The headset line ends inside an 844px window and says a headset was not used. The page does not scroll sideways. The picture is one point in two places. It is a chart and a sphere. The controls sit under the question. That is clear.

Pressing 0 keeps T1 and says the distance is 0, the pole is at distance 1, and the area scale is 1. Pressing Far says the distance to 0 is 0.97, the pole is at 0.243, and the area scale is 0.003. Pressing Pole changes the question to why the corners are one point, and the sentence says the distance to the pole is 0 and the area scale is gone. The orange corners stay orange. The rings on the chart and on the sphere are the circles Exercise 2 asks about. Chapter 9’s introduction, the curvature 4, Figure 2.5.2, and Exercise 14 stay in the folded book line and in the hint.

The T1 badge keeps the thread’s name. Its title says this picture is the chart and the sphere, that the Cartesian and polar pair is the join, and that this card is not a stop on the Test 1 address line. The book line says the same. F2 would mean square, then slide. This picture does not iterate.

The Story Map card is place 27, part J, after the lean. The three lines are F1, F2, and F3. The warp card has no stop on those lines. The lede and the fourth spine line say so. The sidebar paints a solid mark for T1. F2’s mark is a dashed ring. I left the solid mark. It names the thread the picture wears. A dashed ring would call this picture square, then slide.

The footer Story Map on the warp remembers Test 2, where the card is the tenth room. The header Story Map still remembers Test 1, as it does from every room. The footer is the door that returns to this card. I left the header. Retargeting it would move the leave link on the nine rooms before this one.

A fresh `#warp` opens the picture with the assembler at level 0. The kicker says L20 because that is the picture’s name. The unlock is still two changes, on the lean, of the spacing of the roots, with 76 pictures remembered. A hash change from the lean to the warp, and from the warp to the lean, opens the named room in that turn and does not spend the unlock. An unknown hash leaves the open room. The live router does not import from `kit/`. `js/core/map-route.js` is byte-identical to the kit helper.

On the warp, after the picture had settled, the draw count stayed at 146 across 400ms. The still paint stops the clock. The bulbs and the cascade keep painting, because the cycle is still lighting. That is the one clock. `data-xr-proof` is `untried` on every room of the walk. No headset was used.

The cascade was opened and left. On a wide pane the magnified plate sits at the top-right, the ratio is on the glass, and the births of 2, 4, 8, and 16 are the ticks. Period 32 is inside the pile. On a phone the doors are the short names, the question is on the glass, and the plate sits where the name, the ratio, and the birth numerals stay readable. Ray cuts still fade before the edge. A break at c = 1 keeps T2, T3, and F3. The roots stay the cube roots of 1. The question is why the step breaks, and the badge says the staircase stays. The fall at 390 still uses Map, Newton, Roots, Move, and Sphere. None of that blocks the walk.

### Citations needing Shael

Unchanged. Howell & Mathews only. Nothing numbered was invented. Figure 1.4.1 stays PDF Figure 1.15, printed page 22. Definition 1.4.6 stays PDF Definition 1.11, printed page 23.

- Theorem 4.2.20 [PDF Theorem 4.11], Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Figure 4.2.13 [PDF Figure 4.6, page 114], Exercise 10, Theorem 4.2.11 [PDF Theorem 4.9], Exercise 8, Exercise 4. Exercise 4 is the disk at c = 0. Exercise 8 is the cusp and the half-line past 1/4.
- Figure 2.5.2 and Exercise 14. The open-edition HTML matches the picture: Figure 2.5.2 is the Riemann sphere, and Exercise 14 is the coordinate triple. The PDF pin, Figure 2.22 on printed page 73, was not re-opened. The radius on that figure is 1/2, so the curvature on the page is 4. Chapter 9’s introduction is the sentence about angles. The course map stops before Chapter 9.
- Not numbered: external rays and where a ray lands, the Feigenbaum value near c = −1.4012, the cascade, the period-8 birth, the period-16 birth, the period-32 birth inside the pile, the local resemblance, the small copy, the diary as an index, the coloured basins, a higher power z^d + c, a basin figure for degree 4 or 5, the bulb rotation-number order, the sphere as the place a leaving orbit arrives, Newton’s walk on this sphere, and the cubic (z − 1)(z² + z + c) away from c = 1. Equation 1.5.5 is the roots at c = 1. Figures 4.2.5 and 4.2.6 colour z³ + 1. Example 4.2.1 is z² + 1.
- The polar form of −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for it. The page says so. Figure 1.4.1 and Definition 1.4.6 name the angle.
- The warp’s chordal distance, the area scale, and a numbered exercise for the curvature. Those three stay unnumbered on purpose. The page says so.

### Checked

`node tools/check_vectors.mjs` is 225/225. `node tools/fractal-smoke.mjs` exits 0, including Next from the paper through the ten rooms, the warp card on T1, and the distance left unnumbered. `node tools/playground-smoke.mjs` exits 0, including the warp at 390 and at 1280, the origin chip reading distance 0 and area scale 1, a hash `#warp` at assembler level 0, a hash change between the warp and the lean, an unknown hash leaving the open room, a break at c = 1 keeping T2, and `data-xr-proof` untried. `node kit/smoke.mjs` exits 0.

`js/playground/playground.js` and `tools/playground.js` were not edited. They are byte-identical. sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233`.

`films/shared/hostclock.js` was not edited. The live router does not import from `kit/`. `js/core/map-route.js` was not edited and is byte-identical to `kit/template/js/core/map-route.js`.

Headless Chrome, 1280×800. The ten rooms open in Next order. Each question is on the glass. The stage meets the footer and does not run under it. Warp threads are T1. Lean threads are T3 and F3. Fall threads are T2, T3, and F3. A fresh `#warp` opens at assembler level 0. On the wide warp the question is under a 280px stage. The headset line ends at y = 789 in an 800px window. At 390 the opening question is “Where does this point sit on the sphere?” The doors are the short names. The page does not scroll sideways.

Story Map. Next from the paper is the twin. The ten rooms follow, with the assembler skipped. The warp’s card says thread T1, and the map draws no stop for it on F1, F2, or F3.

Screenshots: `/opt/cursor/artifacts/wide-l20-paper-1280.png`, `/opt/cursor/artifacts/wide-l20-twins-1280.png`, `/opt/cursor/artifacts/wide-l20-bulbs-1280.png`, `/opt/cursor/artifacts/wide-l20-cascade-1280.png`, `/opt/cursor/artifacts/wide-l20-rays-1280.png`, `/opt/cursor/artifacts/wide-l20-pole-1280.png`, `/opt/cursor/artifacts/wide-l20-join-1280.png`, `/opt/cursor/artifacts/wide-l20-climb-1280.png`, `/opt/cursor/artifacts/wide-l20-fall-1280.png`, `/opt/cursor/artifacts/wide-l20-lean-1280.png`, `/opt/cursor/artifacts/wide-l20-warp-1280.png`, `/opt/cursor/artifacts/wide-l20-warp-390.png`, `/opt/cursor/artifacts/wide-l20-warp-origin-1280.png`, `/opt/cursor/artifacts/wide-l20-warp-pole-1280.png`, `/opt/cursor/artifacts/wide-l20-warp-book-1280.png`, `/opt/cursor/artifacts/wide-l20-hash-warp-1280.png`, `/opt/cursor/artifacts/wide-l20-map-warp-1280.png`, `/opt/cursor/artifacts/wide-l20-nav-warp-1280.png`, `/opt/cursor/artifacts/wide-l20-cascade-390.png`, `/opt/cursor/artifacts/wide-l20-fall-390.png`, `/opt/cursor/artifacts/wide-l20-lean-break-1280.png`.

### Residue

Ray cuts still fade before the edge. The fade is the cut. An open ring is not a landing. The book does not number where a ray lands.

Period 32’s true place is still about two pixels from the birth of 16. The plate separates them. The ticks stay at the true parameters. The book does not number that birth.

On a phone the cascade plate covers the middle of the diagram so the pane name, the ratio, and the birth numerals stay readable. On a wide pane the plate stays at the top-right.

The cascade hint still scrolls inside the footer. The question, the chips, the chapter sentence, the book line, the doors, and the headset line are on the glass.

A break at c = 1 wears T2. The roots are still the cube roots of 1, and the question is why the step breaks.

The chordal room still uses the display pair. The warp uses the same two lines in text style.

The warp card has no stop on the Test 2 lines. The three lines are F1, F2, and F3. The sidebar paints a solid T1 mark beside the name.

The header Story Map still remembers Test 1. The footer Story Map on the warp remembers Test 2.

`data-xr-proof` stays `untried`. No headset was used. A green smoke run is not a headset session.

Pull request 29 was not merged. Nothing was redeployed.

**READY**

Vectors 225/225. Assembler sha256 `daa301943fe5b4b0efa02d5b1d80474efe8bb68456916903e589701924d7a233` for both `js/playground/playground.js` and `tools/playground.js`.

## From the plane to the circuit (close)

Branch `cursor/plane-to-circuit-43c6`, pull request 32, base `gh-pages`. Scope is the physics delta: `phasor-current`, `complex-impedance`, `wave-phase`, thread C1, and the map, registry, and colour-key wiring. Verdict: **accept with fixes**.

### Fixed

- The impedance claim treated a small imaginary part as in phase. At Z = 0.16 + 0.11i the angle is about 34°, and the sentence said voltage and current share a phase. Sharing a phase is now the angle of Z. A real Z shorter than 0.15 still points E* with I*, and the sentence says the resistor claim needs a longer Z. The origin says there is no voltage arrow. A slant such as 0.16 + 0.11i says the phases do not match.
- "Straight up" and "sits on ψ" stayed true out to about 10°. The neighborhood is now 0.08 rad. At π/2 − 0.2 the phasor claim is false. At π/2 − 0.07 it is still true.
- The fixed current I* was drawn in the ink colour. That colour is not one of the four teaching colours. The arrow and its label are blue, the same blue as the axes. The circuit colour key says so. Orange is the turn and the reactance leg. Green is the point you drag, and the real leg of Z.
- The §5.4 link opened the top of the trigonometric section. It now opens on HTML Figure 5.4.9, id `fig_ch-05-09`, the LRC circuit. The wave link opens on the Chapter 1 paragraph that names the quantum world, id `ch_Complex_Numbers-2-1`.
- The story-map part label said "Circuit and phase (Ch 5)". Global phase is the Chapter 1 tease. The label is "Circuit (§5.4) and phase".

### Checked

Citations, opened on the 202 Updated Edition PDF at complexanalysis.org (title page: 202 Updated Edition). Printed page 155 carries Figure 5.9 and equations (5.42)–(5.44). Printed page 156 carries (5.46) and exercise 4, which names Figures 5.8 and 5.9. Exercise 17, find Z, is on printed page 158. This page does not compute it. The HTML edition numbers the same figure 5.4.9 and the same equations (5.4.11)–(5.4.15). Its exercise 17(a) prints Z = 10 + 10i. That value is not on this site. Printed page 8 is the sentence that some electrical engineers write j. Printed page 1 is the sentence that names fluid flow, electric circuits, and the mysterious quantum world. The wave pin still says "PDF number not checked — intro tease only". No wavefunction theorem number was added.

Each station has one handle. Phasor and wave have two chips. Impedance has three. There is no range slider. The opening phasor claim is false. The ωt = π/2 chip makes it true, and a drag off that point makes it false again. The resistor chip makes the impedance claim true. The inductor chip makes it false. The wave opens on Half turn, claim false. θ = 0 makes it true. Those runs added no console error.

C1 stops are addresses, arithmetic, staircase, powers, phasor-current, complex-impedance, and wave-phase. The map draws 7 green squares. Distance and roots have none. `#home-c1` focuses that line. Home's own threads stay T1, T2, and T3. Test 1 is 24 stops. The live router has no `kit/` import. No film is registered for the three stations.

`node tools/fractal-smoke.mjs` exits 0, including the new claim checks. `node tools/film-smoke.mjs` exits 0. `node tools/check_vectors.mjs` is 225/225. `node kit/smoke.mjs` exits 0.

Headless Chrome, 1280×800 light and 390×844 dark, on all three stations and on `#home-c1`. On each, `scrollWidth` equals `clientWidth`. The circuit colour key is the list on the three stations, and the Test 1 key is hidden there. On `#addresses` the Test 1 key is back and the circuit list is hidden. The 390 phasor page shows the circuit key: blue axes and the fixed current, orange the turn, green the point you drag, purple the readout.

### Residue

The spine is still the four Test 1 lines. C1 is on the map, in the menu, and in the legend. It is not a fifth spine item. The throughline sentence is unchanged.

The C1 line still runs through the stops it skips. The skip is the missing square. With four lanes the wide map is denser than the three-thread map. Whether a learner reads the missing square as a skip is a mid question.

At the peak, the green point and the purple height are the same point. On the resistor, the blue current and the purple voltage share the imaginary axis. The thin blue arrow is drawn on the thick purple one.

The plane still offers zoom and pan. The lesson control is the one handle.

No film. The drag is the clock. A host clock would redraw a turn the hand already makes.

Chapter 10, fluid flow and electrostatics, is named in `RESEARCH_LOG.md` and is not on this map. The homework export in pull request 31 was left alone. The playground's own line that Test 1 is Chapters 1 to 3 was left alone.

Pull request 32 was not merged.
