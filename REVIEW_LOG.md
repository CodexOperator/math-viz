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

