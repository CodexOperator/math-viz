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

# Study-site kit, batch 1

Branch `cursor/study-site-skill-6486`, off `gh-pages`. A reusable kit under `kit/` that scaffolds a story-map study site. The live pages are untouched. `node kit/smoke.mjs` scaffolds the MAT 412 example under a `/math-viz/` subpath and drives headless Chrome. It exits 0.

The four rounds below were checked together by that smoke run, because they share one scaffold.

## Round 1 — a site, a citation, and a hard stop

**Problem.** An agent asked to “make one like this” had the finished MAT 412 site and no reusable contract. It also had no rule for what to do when the textbook is unknown.

**Change.** `kit/scaffold.mjs` copies `kit/template`, writes `js/generated/data.js`, copies `vendor/katex`, and rewrites the title, footer, palette, and storage prefix. Every station, concept, flashcard, and problem must carry `source.chapter` and `source.section`. Problems must carry `source.exercise`. A visible `.source-tag` renders that citation. If `textbook.title` is missing or a placeholder, the scaffold throws and the CLI exits 2 with instructions to ask the user.

**Verified.** Smoke: a config with no textbook sets `askTextbook` and does not write a site. The example site’s home source tag contains “MAT 412 course handout” and “Chapter 1”. Every station has a chapter and a section. Every problem has an exercise. No asset request left `/math-viz/`. No console errors.

## Round 2 — the map is the course

**Problem.** A generated site can list topics and still not be one story. Test 2 of the reference site showed the failure mode: a thread badge and a topic row that repeat the lede.

**Change.** Home draws the stops in order and draws a thread only when it crosses at least two stops and not every stop. Test 2’s single F1 thread is not drawn. Topic chips appear only when a map has at least six concepts. Each station footer links to the previous and next stop on the map and along each drawn thread. A hash such as `#julia` forces that map and remembers it.

**Verified.** Smoke: Test 2 stations are home, julia, newton, and the thread list to draw is empty. `#topic-J1` opens Julia with `data-map="test2"`. The Test 2 menu does not contain “One Point, Two Addresses”. Reloading `#home` stays on Test 2, with Julia on the map, addresses absent, and zero topic chips. Test 1 home shows at least six topic chips and a link to `#addresses`.

## Round 3 — cards and questions on the same map

**Problem.** Flashcards and practice were not separate components on the reference site. The problem index is a reveal deck. A generated course needs both, cited, without a second app.

**Change.** Kind `flashcards` is one card at a time. The back stays hidden until “Show the back”. Kind `practice` is the question list. Hint and answer start closed. Each card has its own source tag. Deep links `#problem-1-3-1` and `#topic-T1-3` open the teaching station, and the exercise is rendered on that station.

**Verified.** Smoke: eight flashcards are not required to count; the back of the first card opens and its source tag contains a section mark. The practice list has at least six problems. Opening a hint shows the hint text. `#problem-1-3-1` resolves to addresses. The exercise tag `1.3.1` is on that page.

## Round 4 — one picture that matches the exercise

**Problem.** A map of reading pages is not Test 1. The starter needed one real gesture, and it needed to be the exercise it cites, not a demo point.

**Change.** `two-addresses` draws one draggable dot. Blue dashed drops are the Cartesian address. The orange ray and arc are the polar address. The dot starts at −1 + i√3, which is handout exercise 1.3.1. Chips light only on the value they claim. The colour key is data, swapped with the map: Test 2 says “stayed”, not “Cartesian address”. `number-line` is the other built-in, for a later course that is not complex. Stations with no built-in picture stay reading pages. They say what to look at. They do not draw a fake fractal.

**Verified.** Smoke: addresses has a canvas. The chip “−1” presses and the readout becomes `x = -1.000`. The 1.3.1 source tag is on the page. On Julia the colour-key text contains “stayed” and does not contain “Cartesian address”. At 390px the addresses page does not scroll sideways. Unknown hash `#not-a-place` is a “No such place” panel.

## Choices

These were picked. They are not questions.

- **The example textbook is the MAT 412 course handout.** The repo never names a published book. Searching did not turn up a title that matches the handout’s section names and exercise wording closely enough to cite. Guessing Churchill, Zill, or Saff would invent a source. The handout is what the live site already attributes. A later batch may replace the title when a real book is named. Until then the skill stops and asks.
- **`storagePrefix` is `study:`.** The live site uses `mv:`. A scaffolded copy on the same origin must not overwrite the live map and theme.
- **Six exercises, not all 29.** The example shows the schema. The full handout stays in `js/data/problems.js` of the live site. Copying every prompt into the generator would turn the kit into a dump.
- **Most stops are reading pages.** Julia and Newton are not reimplemented here. A fake canvas would teach the wrong lesson. The skill tells the next builder batch to replace a reading page with one gesture.
- **No flip animation on flashcards.** A reveal is the interaction. Motion that does not teach is furniture.
- **Reframe loop, decided in the kit.** After close, mid, and wide reviewers: 3 independent reframers, one rebuttal each, a council that picks one pitch or a synthesis, then a builder prototype. Cap of 3 rounds, stop earlier on convergence. Nobody asks the user. `kit/mcp-tool.json` records `loop.reframe_rounds` and `loop.reframers`. This batch did not run a reframe. The reviewers have not spoken yet.

## Another batch

Not from this builder. The next pass is the close reviewer, then mid, then wide, then the reframe council if those reviews land. The thin reading pages are the known gap. They are named in the log so a reviewer can send the next batch at a real picture rather than at more prose.

# Study-site kit, batch 2

The three reviews of batch 1 are in `REVIEW_LOG.md`. They kept the teaching recipe and named the production failure: 20 of 24 stations were reading pages, and the only canvas was the address plane. This batch draws pictures. It does not open a reframe. Scaffold still lists 16 reading stops, including Julia and Newton, so a reframe would still be a new syllabus.

## Round 1 — two gestures, and the two narrow tools left narrow

**Hand.** On a graph, drag x. On a shape, drag one parameter t.

**Mark.** The graph's purple mark is the output value. The shape's purple square is the image of the green square.

**Sentence.** Each picture carries a claim that is true in one state and false in another. A sentence that survives every chip is a slogan.

**Picture.** `graph` and `shape`, added beside `number-line` and `two-addresses`. The number line still shows only x. The address plane still shows one complex point and its argument. Neither grew a second job.

The graph's function is data. `poly` is coefficients, constant term first. `abs` is |x|. `arg` is the principal angle of the angle you walked. There is no eval. `arg` is in the vocabulary because a polynomial cannot jump, and a jump is a real lesson.

The shape is a 2×2 on a square, not a free vector. The address plane already draws one arrow from the origin. A second arrow tool would be that picture with a new name. `action` is `rotate`, `stretch`, or `shear`. `samples` is two to four matrices blended by t. A station sets one of those, not both.

## Round 2 — four reading stops become pictures

**Staircase** is `graph` with `fn: "arg"`, domain [2, 4.2], chips before π, near π, and after π. The hand drags x. The purple value is Arg. Before π the sentence says the name and the walk agree. After π it says the name jumped. The address plane already shows one point's Arg, on exercise 1.3.1. The staircase is that name as a function. Source stays §1.3, handout title, with the numbering note. This stop has no exercise of its own; 1.3.1 stays on the address plane.

**Roots** is a custom module, `kit/stations/roots.js`, not a port of `js/stations/`. Chips 4, 5, and 6. The points stay equally spaced. The sentence is true only at 5: five gaps, the fifth roots of 1. At 4 or 6 it says these are not those roots. Exercise 1.4.1 stays on the page, source §1.4. A graph cannot draw five points, and a 2×2 on a square is four vertices. Stamp is the right escape, and the file does not export `STAMP_OPEN`.

**Mappings** is `shape` with `action: "rotate"`. Chips ×1, ×i, ×−1. The sentence is true only at the quarter turn: multiplication by i. Exercise 2.1.1 stays on the page, source §2.1, Howell URL. The card still asks for u + iv of z² + iz. The picture shows the turn the hint names. A warped grid for z² is not a 2×2, so it is not faked here. That grid is a later stamp.

**Derivative** is `shape` with two sample matrices, a 45° turn blended into a shear. Chips turn, between, shear. The image is a square on the turn and a smear on the shear, and the sentence says so. Source stays §3.1. A graph of a real f'(x) would teach a different course. This section's sentence is the local linear map.

## Round 3 — the home teaches

The generated home is a finder, one dot, and the map. The finder searches stops, topics, and problems on the current map. The dot has no chips. It is the only control on that picture. `viz.picture` is `point` or `line`. Unset, a site that already has `two-addresses` gets the point, and every other site gets the line. The example sets `point` and starts at −1 + i√3, the same point as exercise 1.3.1. The sentence changes on the seam. The map's four-column serpentine layout is untouched. Predict-first stays off the cards.

## Choices

- **A 2×2, not a vector.** Justified above. A linear-algebra course that wants one arrow from the origin, and means two readings of it, already has `two-addresses`. A different arrow is a custom module.
- **Staircase is the graph of Arg, not a second address plane.** The two pictures answer different sentences.
- **Roots is custom.** The four gestures cannot say "five equal gaps."
- **Mappings shows the quarter turn, not the grid of z².** The exercise card keeps the algebra. Drawing a grid with a matrix would be a lie.
- **Derivative is square versus smear.** Same built-in as mappings, different data, different sentence. Mappings asks "is this multiplication by i?" Derivative asks "is the image still a square?"
- **No reframe.** Sixteen reading stops are still unfinished. Julia and Newton stay on that list.

**Verified.** `node kit/smoke.mjs` exits 0. The home finder and the dot are on the page, the dot has no chips, and the readout starts at −1.000, 1.732. Searching "roots" links to `#roots`. The staircase chip after π shows a negative value and the jump sentence; the chip before π shows the agreeing sentence. Five roots cites exercise 1.4.1; four roots says they are not the fifth. Mappings at ×i says multiplication by i and cites 2.1.1; the ×1 chip is not pressed. The derivative turn reads `image = square`; the shear reads `image = smear` and the smear sentence. A fresh one-map course with only a number line gets a finder and one real dot, and the readout does not say "angle". Julia and Newton are still reading. Test 2 still draws no costume thread. No console errors. No sideways scroll at 360px.

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

## Matrix, films, step, icon — 2026-10-20

Branch `cursor/matrix-films-step-icon-20b3`, off `gh-pages`. The matrix skill is not on this machine, so the row and stage names are the ones in the ask (what the picture shows, and layout / reveal / transform / emphasize). The table lives in `js/data/matrix.js` and is drawn on both homes. The serpentine map underneath is still the book’s Next order. That order is the exam walk. The matrix is the other door, not a replacement.

### Classification

Doors, not cells: home, the index, the problem index.

| Stop | Row | Stage | Note |
| --- | --- | --- | --- |
| addresses, distance, sets, disk | R21 complex plane | layout | the point, the length, the regions |
| staircase, principal-root, branches | R21 | reveal | a name, the home step, the cut |
| powers, roots, julia | R21 | transform | the same point, moved |
| arithmetic, linear | R2 linear maps | transform | turn, stretch, slide |
| curves, repeat | R14 flows | transform | z(t), then the same move again |
| mappings, powermap, reciprocal, lab | R11 functions | transform | a motion of the plane |
| graph4d | R11 | layout | shadow of lab. Kept. The lab already turns this graph; this stop opens that one view. Twenty-one Test 1 stops stay twenty-one, and reciprocal and branches still link here. |
| limits, derivative, cauchy-riemann | R11 | emphasize | every direction, the zoom, no mirror |
| newton-step | R11 | transform | one correction |
| newton, half | R11 | emphasize | which root, the real wall |
| harmonic | R11 | emphasize | side. Section 3.3, possible, still off Next. |
| sequence | R16 sequences | reveal | a list with a fate |
| series, zero, paper | R16 | emphasize | the bags, the orbit of 0, the flat paper |
| seeds | R16 | layout | the set of c, stated and not drawn. Moved from part E to sit after zero, because that set is the orbit of 0 collected over c. Part E’s label stays so old notes still name it. |
| geometric | R16 | transform | the closed form |
| powerseries | R16 | layout | the disk of a series |

No hash was renamed, so the router did not need an alias.

### Films

A move-over-time was added where a still cannot show the change. Four new pages, plus the three that were already there, now reseed from the station.

| Film | Station | Why a still is not enough | Citation |
| --- | --- | --- | --- |
| seam | staircase | Arg jumps while the point stays smooth | §1.4 Arg z. PDF number not checked. |
| settle | sequence | the terms land, or they do not | §4.1 Definition 4.1.1. PDF Definition 4.1, already checked on this site. |
| approach | limits | a straight walk locks g(z); a spiral keeps turning | §2.3 Definition 2.3.1. PDF number not checked. |
| newton-walk | newton-step | five corrections land on i | §4.2 Example 4.2.1. PDF Example 4.7, already checked. |
| multiply, unity, orbit | arithmetic, roots, zero | already shipped; `draw(t)` now reads the station’s z, n, or c. With no numbers yet, the book’s example is the picture. | unchanged |

`films/shared/fit.js` exposes `window.__setFilmParams`. The station calls `publishFilmParams`. The film’s own step, when it has one, is merged in. Series, geometric, disk, and half flip a sentence with a chip. They do not sweep a quantity, so they did not get a step control or a film.

### Step

`js/core/stepper.js` is the one control: a log slider from 0.00001 and a text box on the same number. Enter or blur commits. A bad entry reverts and the hint says the range. The readout is plain digits.

The stations that walk a quantity: Julia (the +/− pair became this group; a step below 0.04 is drawn live, many quanta per frame, one coarse 96×24 fill, so the frame cap does not widen a tiny step; 0.08 still uses the stored-frame film), limits, curves, the staircase lap, repeat (the “one more step” button became the group, with Play inside it), and the Newton walk (the full walk stays on screen until Play). The closed form `quantize` is the substep when the body is a pure increment. `runSubsteps` stops at 8 ms. A coarse Julia fill of 96×24 measured under 30 ms in `node tools/fractal-smoke.mjs`.

The kit copies `js/core/stepper.js` and the film panel. `kit/SKILL.md` says so.

### Icon and host

The mark is one point reached by blue Cartesian legs and by an orange ray with an angle wedge, on a dark rounded tile with a cream rim. Favicon files, `site.webmanifest`, and the header hook use that geometry. `wrangler.jsonc` names a Workers static-assets deploy `math-viz` of the repo root. `.assetsignore` leaves out kit, tools, logs, and tests. `404.html` links back with a relative URL. Nothing was deployed. The live pages were already relative; no `/math-viz/` path is hard-coded in the site.

### Wide review

The cell table above is the classification record. It is not drawn. Both homes show `THROUGHLINE` in `js/data/matrix.js`: the turn, that angle divided, and the same move again. The map banners and the menu are the chapter and section names. Layout, reveal, transform, and emphasize stay in the record and off the page. The `c = i` headline is Stays, and the line names the cycle. The multiply arc radius follows `|z|`.

## Films on M0.2j — 2026-10-22

Branch `cursor/film-hostclock-m02j-ba63`, off `gh-pages` at `b993f00` (PR #8). The film side moves onto the shared trunk's host-clock mode M0.2j (manim-hyperframes-matrix v0.4.4). PR #7's portrait floor and PR #8's live reseeding stay.

### What moved

All seven films moved: multiply, unity, orbit, seam, settle, approach, newton-walk. None stayed on the old glue.

Each `draw(t)` already reads `window.__filmParams` and returns. `__setFilmParams` is one synchronous redraw of the current time. It does not seek, it does not start a ticker, and it does not schedule a frame. Unity adds a step or a dot only when `n` grows, and that write happens inside the redraw, not on a timer. The param hook does not fight the host clock, so the "leave it" case did not come up.

### Choices

The trunk's `fit.js` and the site's portrait stack cannot share a name. `films/shared/fit.js` and `films/shared/hostclock.js` are the v0.4.4 files, with a header that names the trunk. The portrait CSS, the 835px cut, and `__setFilmParams` moved to `films/shared/stack.js`.

`data-layout="stacked"` stays on `<html>` for the life of the page. The portrait switch writes `data-stack`, never `data-layout`. If the stack wrote `portrait` or `wide` into `data-layout`, the trunk fit rule would start scaling and a 23px cite at 390px would land near 7px. Stacked means fit.js does not scale, including upward, unless `?fit=1`.

Script order is gsap and stack.js in the head, the page script that sets `window.__tl` and calls `__filmFit`, then fit.js, then hostclock.js. The host clock has to run after the timeline exists. It opens on the end frame and sleeps GSAP.

`js/core/film.js` seeks `window.__hostclock.seek(t)` and copies `__hostclock.readouts()`. It does not call `ticker.sleep()` on that path. `createMotion` is still the only clock: 0 frames while paused or hidden, pause freezes, the next click continues, a finished film plays again, reduced motion says Next step and then Start again. The shared step control still merges its number into `__setFilmParams`. The stage scaling above 835px stays in the panel. That is the embed chrome. The page's fit.js does not scale as well, or the type would shrink twice.

A page with no `__hostclock` still gets the old seek-and-sleep glue. The kit's scaffold now rejects a film that is not M0.2j, so a generated site does not ship that path. M0.2i stays forbidden in a station. M0.2j is the standard, in `kit/SKILL.md` and in `tools/films/make_films.py`.

Same-origin only. These iframes are same-origin, so the panel calls `__hostclock` directly and the pages do not list host origins.

A film page opened on its own needs a viewport meta (`width=device-width`). Without it the layout viewport stays near 980 and the 1280px root scrolls sideways on a phone. `house.css` also sets `html, body { width: 1280px }`, so `innerWidth` can still report 1280 while `documentElement.clientWidth` is the real viewport. `stack.js` measures the narrower of the two and applies again on `DOMContentLoaded` and `load`. Each of those calls returns. They are not a clock. The generator writes the same meta.

### Trunk request

M0.2j has no param channel. Please add one: `window.__hostclock.setParams(obj)` and a postMessage `{hf:'params', params}` that calls a page hook and answers with `{hf:'state', ...}` the way seek does. Until that exists, this site keeps `window.__setFilmParams` in `stack.js`. A cross-origin host cannot use it. The live numbers from PR #8 (the station's z, n, c, path, and the step quantum) depend on it.

### Checks

`node tools/film-smoke.mjs`, `node kit/smoke.mjs`, and `node tools/fractal-smoke.mjs` passed.

Headless Chrome, arithmetic film paused, 500ms window, at `/` and at `/math-viz/`, light and dark:

| width | stack | page width | site frames | iframe frames | ticker frames | ticker |
| --- | --- | --- | --- | --- | --- | --- |
| 1280 | wide | 1280 | 0 | 0 | 0 | asleep |
| 700 | portrait | 602 | 0 | 0 | 0 | asleep |
| 390 | portrait | 322 | 0 | 0 | 0 | asleep |

Same twelve cells: host readout equals `__hostclock.readouts()` (six lines, `zw = 5 + 14i`), no sideways scroll on the site or in the iframe, `data-layout="stacked"` and not `data-fitted`, shown text at least 15px, theme matches, the button says Play at t = 10, no console errors and no 404s.

Typing `z1 = 1` on both prefixes changes `zw` from `5 + 14i` to `−1 + 4i`, and the host text matches `readouts()`. The approach film's own step slider, set to its max, changes `step 0.02` to `step 0.2` and the ticker stays asleep. Play then Pause on both prefixes: the button says Pause while it runs, then Play, then 0 site frames and 0 iframe frames with the ticker asleep.

`films/film-multiply.html` opened directly at 390, light and dark, both prefixes: portrait, `innerWidth` 390, `clientWidth` 390, `scrollWidth` 390, not fitted, ticker asleep, 0 frames over 500ms, six readouts, theme matches.

## Paths, deep zoom, and the Mandelbrot set

The learner should watch a set change as its parameter moves, then zoom until the copy of the shape is the picture, and then see whether a glob of orbit points is one point or many.

### No rendered-film switch

Pages is a static host. A live Manim render needs a server, and this site does not get one. A pre-rendered clip of one canonical loop was considered and skipped. The loop the learner draws, types, or retunes with a slider is the object. A clip cannot follow that path, and it would be a second clock beside `createMotion`. The move that teaches the boundary is the HyperFrames film on the Mandelbrot stop (`films/film-boundary.html`, host clock M0.2j). It walks c from inside the cardioid, through the cusp at 1/4, and out. `setParams` replaces that c with the station’s c. The film does not play itself.

### Two doubles, then a stop

Below width 1e-13 a pixel offset added to the centre is lost in one double. The plane stores the centre as two doubles (`deep: true` in `js/core/plane.js`, no import, so the plane file stays free of modules). The worker iterates z² + c and Newton’s step in those two doubles directly. Perturbation was rejected: a glitch would look like a feature of the set. The picture stops at width 1e-28. The centre box says “Stopped at width 1e-28. Two doubles run out of digits past that.” Below 1e-13 the same box says the picture is on two doubles.

### One step control

The existing log slider is the loop speed (that fraction of a turn each second), the zoom factor (each + multiplies the width by 1 + step), and the nudge for Re c, Im c, Re z₀, and Im z₀. Fine, or Shift while dragging a slider, makes that slider one step wide, centred on the current value. Continuous zoom uses the same clock and the same factor, about one button-press of zoom every 0.45 s. Reduced motion steps once and does not say Pause.

### The path

Loop sits next to Play again (Julia) or Play the walk (Newton), and under the picture on the Mandelbrot stops. The picker is one control: a drawing, a preset, or a typed formula. Every preset is a formula. Choosing it loads the formula, so the learner can edit the names. Free names other than t, i, pi, and e become real variables, each with a slider and a text box. The parser is recursive descent in `js/core/path-expr.js`. It does not call eval. A bad formula stays on screen with a hint and does not move c.

On Julia the path is an inset c-plane. The faint picture behind a drawing is the Mandelbrot set, because that is the map of c. On Newton the moving parameter is the blue root r₁, not c, so the inset does not draw the Mandelbrot set. On the Mandelbrot stop the path is drawn on the set itself, and the Julia set of that c is the picture beside it.

While the loop moves, the worker paints a coarse frame and keeps only the latest request. Pause posts one sharp frame and then nothing. A hidden tab posts nothing, because the clock is `createMotion`.

### The orbit

The walk keeps adding points until it escapes, leaves the screen, or the last K points sit inside a disk of radius R. K defaults to 5 and cannot go below 2. The disk is the average of those points, drawn on the picture, and the line says which of the four endings happened (the fourth is the cap). Zoom to the cluster frames that disk. On the Mandelbrot stops the walk lives in z, so the disk is drawn on the Julia picture beside the set, and the cluster button frames that picture.

The period on the cardioid stop is the shortest cycle the orbit of 0 has fallen into, within 0.001, after 240 steps. 0 means it left. c = 0 is period 1. c = −1 and c = −0.75 are period 2. c = 0.3 leaves. Only the main cardioid is outlined, from c = λ/2 − λ²/4 on |λ| = 1, which is the fixed-point condition of Theorem 4.2.20 [PDF Theorem 4.11]. Higher bulbs are not outlined. Figure 4.2.13 is the book’s picture of them. Its PDF number was not checked.

### Where it sits

Two stops, both in part C, so the part letters stay A B C D F H G. Mandelbrot is M1 (Example 4.2.16 [PDF Example 4.11], and Theorem 4.2.11 [PDF Theorem 4.9] for connectedness). The cardioid stop is M2. The exercises stay on the seeds stop. The book does name the Mandelbrot set, in §4.2. The closest checked anchors are the disk inside the set and the connectedness theorem. The film cites those two, both with checked PDF numbers.

### Checks

`node tools/fractal-smoke.mjs`, `node tools/film-smoke.mjs`, and `node kit/smoke.mjs` passed.

Headless Chrome, Test 2 served from a local static server: Julia idle after the first picture posts no further generation; the loop posts frames, Pause posts one sharp frame and then no more; `2+` shows a hint; the circle preset builds sliders for cx, cy, and r; width 1e-14 switches the line to two doubles and a click still returns at once; width 1e-40 stops at 1e-28 and says so. Newton’s loop uses the same variables. The Mandelbrot stop shows the Julia companion, and its loop pauses cleanly. c = 0 on the cardioid stop reads Period 1. No console errors and no 404s. No sideways scroll at 360 px on Julia, Newton, or Mandelbrot, or at 390 px on the cardioid stop. Screenshots cover 1280, 700, and 390 in light and dark.

### Host clock v0.4.6

`films/shared/hostclock.js` is the trunk file, byte for byte (sha256 `337ab42d404831909585139e8e8e0f553379faf4802543879abe336adbe6c65c`). v0.4.6 accepts a plain object or array from the parent realm and rebuilds a frozen copy in the page. The panel no longer parses the payload with the iframe’s `JSON`. It calls `iframe.contentWindow.__hostclock.setParams` with the parent object. An Array subclass nested in that object is refused, so `plainParams` copies every array into a plain `[]` before the call. The eight films still take numbers and strings. None of them sends an array. The copy is there so a later list cannot be a subclass by accident.

## Rendered films, and the multiplier on a settled orbit

Branch `cursor/rendered-films-settle-f114`, off `gh-pages` after pull request 10. Two additions. The Playground in pull request 11 was left alone: nothing under `js/playground/` changed.

### The films

Report Generator’s two Manim films are the canonical loops, not a second copy of whatever path the learner draws. They sit in `media/films/` under stable names. Film A (the cardioid walk) is on the cardioid stop. Film B (real c from 0 through 1/4 to 0.45) is on the Mandelbrot stop. Each has a 1280×720 cut and a 720×1280 cut that was laid out again, plus the poster at the hold the README names.

The switch is a radio pair, Live and Rendered film. Live is the JS loop that was already there. It is the one that opens. Rendered shows one `<video>`: `muted`, `controls`, `playsinline`, `preload="none"`, no `autoplay`. The poster is the still, so the frame is on screen before Play. The portrait file is the `<source media="(max-width: 599px)">`. 390px gets the portrait cut. 700px and 1280px stay landscape. 600px is landscape; “under 600” is the cut.

One clock. Choosing Rendered pauses the live loop, and the live pictures are hidden so the page is not animating twice. A hidden tab pauses the video; if it was playing, it continues from that frame when the tab is visible again. Unmount pauses it and drops the listener. The HyperFrames film already on the Mandelbrot stop is a different control and was not retimed.

Coming back to Live after the video has moved seeds the orange point from the frame log. The log is the landscape jsonl. The portrait cut is the same c(t), so one log covers both. The nearest logged frame wins. On the cardioid stop, if Loop is on and the path is still the cardioid, the loop parameter is that turn: θ = 0, 2π/3, π, 4π/3 and 2π land on t = 0, 1/3, 1/2, 2/3 and 0. Film B’s c is not on the circle the Mandelbrot stop loops by default, so only the orange point moves. If the log fails to load, Live still opens and the point stays where it was.

The credit line says the film was rendered with Manim and links the textbook source the stop already uses. The cardioid stop stays on the fixed-point anchor (Theorem 4.2.20). The Mandelbrot stop stays on Example 4.2.16. No new section number.

Film C is a second rendered film on the Mandelbrot stop, behind the same Live / Rendered switch. The Film picker says Leaving into dust or Deep zoom to a minibrot. Leaving still opens. The clip is 19 s, centred on the period-70 nucleus c* = −0.7468707761049912 + 0.13335830940823915i. Width is 3.2 until 1.8 s, then w = 3.2 e^{−1.3093(t−1.8)} until 15.8 s, then 3.5e−8 through the end hold. The frame log keeps centre, width, and N. The trailing k = 570 line is the clock tick after the last frame and is ignored. Coming back to Live from Film C sets the live window to that frame’s centre and width, and moves the orange point there. The credit still says the film was rendered with Manim. It cites Wikimedia Commons, File:Mandelbrot_sequence_new.gif, as the start point, and says the nucleus is this picture’s Newton solve. The portrait cut is still the one under 600 px.

### The settle guard

K stays 5, with the floor 2 and the ceiling 64. R stays 4 CSS pixels in world units until the learner types a radius. The screen disk and the centre-drift test (at most R/16, a quarter of a pixel) stay. Two checks were added in front of the word Settles.

Escape is first. Julia already uses `|z| > max(2, |c|)`. Mandelbrot uses `|z| > 2`. A quadratic walk that forgets to pass an escape test now uses `|z| > 2` inside `orbitUntil`, still before any disk.

The multiplier is the product of `|f'|` on the last p points, and it has to be strictly below 1. For `z² + c` that factor is `|2z|`. The product is the whole window. Stopping at the first factor that exceeds 1 would reject the basilica and the rabbit, because one point of those cycles has `|2z| > 1` and another is the critical point. The full product is 0. For Newton the factor is `|N'(z)|`. A Settles landing is called a root only when `|p(z)| ≤ 1e-4`. The Newton step snaps when it is already within that squared distance of a root, and that snap counts as `|p| = 0`. An attracting cycle that is not a root still says Settles, and the sentence says it is not a root.

The disk rule with K = 5 and the drift test already refused the false stops the note measured for Julia `c = 0.26` at `R = 1e-2`. Two thousand starts in `[-1.8, 1.8]²`, seed 20261023, all escaped, with the guard and without it. The note’s count was for a looser window (K = 2 or 3, no drift). The multiplier is what fixes the landings the drift test cannot see: the orbit sits exactly still, so the centre drift is 0, and the cycle is repelling.

`c = 1/4 + ε` was the hole a single window could not close. The product is under 1 only while the point is still short of 1/2. A window whose product is at least 0.93 and still below 1 does not land. The walk keeps that first disk and continues until the orbit escapes or 12000 further steps pass. A later window whose product reaches 1 is the approach passing `|z| = 1/2`, not a Stays verdict. `ε = 1e-4` leaves on step 312. `ε = 1e-5` leaves on step 991, including on the station disk `R ≈ 0.07`, where the first product is about 0.95. The basilica's product stays below 1 and it never escapes, so it is still Settles, period 2, at the step the disk first closed (step 208 at `R = 0.02`). `ε = 1e-8` leaves near step 31000 and can still read Settles. Shrinking R under a pixel was not the fix.

### Settle results

Screen R is `radiusInWorld(4, 800) = 0.02`. The guard column is the product of `|2z|` (quadratic) or `|N'|` (Newton). “False” means the walk was called Settles and a longer continuation escaped.

| case | R | guard | result |
| --- | --- | --- | --- |
| c = 0.26, 2000 starts in [−1.8, 1.8]² | 1e-2 | off | 2000 escape, 0 false |
| c = 0.26, same 2000 starts | 1e-2 | on | 2000 escape, 0 false |
| c = 0.26, same 2000 starts | 0.02 | on | 2000 escape, 0 false |
| c = 0.26, orbit of 0 | 1e-2 | on | Leaves, step 30 |
| c = i, orbit of 0 | 1e-2, 0.02, and 1e-6 | off | Settles, period 2 (false: repelling) |
| c = i, orbit of 0 | same three | on | Stays, period 2, \|λ\| = 4√2 ≈ 5.657 |
| c = −2, orbit of 0 | 1e-2, 0.02, and 1 | off | Settles, period 1 (false: repelling) |
| c = −2, orbit of 0 | same three | on | Stays, period 1, \|λ\| = 4 |
| c = 1/4 + 1e-2, orbit of 0 | 0.02 | on | Leaves, step 30 |
| c = 1/4 + 1e-3, orbit of 0 | 1e-2 and 0.02 | on | Leaves, step 97 |
| c = 1/4 + 1e-4, orbit of 0 | 1e-2 and 0.02 | on | Leaves, step 312 |
| c = 1/4 + 1e-5, orbit of 0 | 1e-2 and 0.02 | on | Leaves, step 991 |
| c = 1/4 + 1e-4, orbit of 0, no \|f′\| | 0.02 | off | Settles, period 1, step 68 (assembler walk) |
| c = −0.75, orbit of 0 | 0.02 | on | Settles, period 2, step 208, \|λ\| ≈ 0.986 |
| c = −1, orbit of 0 | 0.02 | on | Settles, period 2, step 19, \|λ\| = 0 |
| rabbit centre, orbit of 0 | 0.02 | on | Settles, period 3, step 29, \|λ\| ≈ 0 |
| Newton z³ − 1, start 0.8 + 0.1i | 0.02 | on | Settles, period 1, a root, \|N'\| = 0 |
| Newton z³ − 2z + 2, start 0 | 0.02 | on | Settles, period 2, not a root, \|N'\| = 0 |

The rabbit centre is `−0.122561166877 + 0.744861766620i`. The ordinary cap is 800 steps. A window multiplier in `[0.93, 1)` continues for 12000 further steps, which is what the two cusp rows use. The assembler row does not. The threshold sits under the station disk: at `R ≈ 0.07`, `c = 1/4 + 1e-5` first closes near 0.95, and 0.95 would have called that Settles.

## Playground — the void answers a touch

Branch `cursor/playground-void-31d3`, off `gh-pages`. One page. The assembler is the seeded picker only. No language model.

### Where it lives

`playground.js` is vendored byte for byte at `js/playground/playground.js`. The vector checker is `tools/check_vectors.mjs`. The only change from the uploaded checker is the import path. `node tools/check_vectors.mjs` is 54/54.

The void is its own page, `playground.html`, so the study shell does not own the clock. The Test 2 story map still has a stop: station `playground` (part H, order 17) redirects to that page. It is in `OFF_NEXT` with the harmonic radius, so the paper's Next stays empty and Test 1's 21 stops are unchanged. The Test 2 home header has the link, labelled **Experimental: Playground**. The menu uses that full title. The map node uses the shared `shortTitle`, which cuts at the colon, so the dot reads **Experimental**. I did not change `shortTitle`. It is used by every other stop.

`index.html` and `js/app.js` are untouched, so the other builder's gh-pages work can rebase.

### How a touch becomes ink

The first picture is L0. The tap is counted after the pick, so one tap cannot skip watch. The next composition waits until the roll (2.4 s) and the ink-settle (0.6 s) finish. A new pick sinks for 0.8 s first.

The spec writes `smoothstep(u - 0.08, u, n/maxN)`. At u = 0 that shows every pixel, then erases the low escape times. The prose says the opposite: low n first, and nothing at u = 0. The prose wins.

`n/maxIter` still blinks. Almost every point outside the set leaves in a handful of steps, so those pixels share the first tenth of the roll, and the palette's low end was navy on a navy void. The diary key is `1 - e^{-(n-1)/8}`. The compositor opens a window 0.22 wide on that key, so each band takes about half a second and the shape is still arriving after a second. Colour starts at blue (`--cart`), then orange, then purple. The void stays navy, so the first ink can be seen.

Stars are 2000 points from `fnv(learnerId)`, drawn once. Device tilt redraws them only when the shift changes by 0.002 or more. A drifting starfield would be a clock that never stops, and idle would not be 0 draws.

The visible canvas is 2D. WebGL2 bakes an offscreen canvas, sized once at 2560×1600. Resizing a live WebGL canvas drops the context and the bake. Composite uses `clientWidth`, so the roll's CSS scale does not resize the bitmap every frame. If `getContext('webgl2')` fails, the same 2D canvas paints a sliced CPU bake, 24 rows at a time, long edge at most 256. That is one kernel on the main thread, not a Worker. After the bake, a frame only changes alpha.

The GPU probe is the spec's 512² Julia, median of up to 5 frames, and it stops starting new frames after 400 ms. SwiftShader here is gpu 0 and still WebGL2. A wheel burst counts as one pinch. On the sphere and the height field, a drag orbits the camera. `drag-c` does not take that drag.

XR stays behind feature detection. `caps.xr` is immersive-ar, as the spec probes it. The button says Enter AR when that session exists, and Enter VR when only immersive-vr does. It is hidden otherwise. Nothing requests a session until the click.

One `createMotion` clock. A hidden tab does not advance it. Device pixels cap at 1.5. Reduced motion is a fade of the whole picture: no scale, no blur.

Every scene sets a KaTeX formula. The citation is an existing station citation for that map. Julia uses the Julia pin, Mandelbrot uses the seeds pin (Example 4.2.16), Newton uses Example 4.2.1. `z^d + c` has no station citation, so the line is "not in the course text".

### Checks

`node tools/check_vectors.mjs` 54/54. `node tools/film-smoke.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` passed.

Headless Chrome, fresh profile, light and dark, at 1280, 700, and 390, plus 360 for scroll. The void is up with 0 draws across 700 ms of idle. A click or a touch moves the phase to roll. At about 0.7 s the ink is partial (page mean about 36, 56, 79). At about 1.6 s the Julia is written (mean about 98, 150, 202) and still on the L0 key `julia/plane/smooth/nudge/roll/none`. Hiding the tab freezes the draw count. No console errors, no 404s, no sideways scroll. Stubbing `getContext('webgl2')` selects the CPU tier and still rolls a picture. Reduced motion lifts the whole image from a faint mean alpha of about 27 to about 156 across a second, with no scale.

Not verified: a real headset. Enter AR / Enter VR was hidden in headless Chrome, which reports no immersive session.

### Orbit-settle defaults, K = 5

Matrix Master replaced the module, the vectors, the checker, and the spec. `js/playground/playground.js` and `tools/playground.js` are the same bytes. The checker imports `./playground.js`, so the copy beside it in `tools/` is what `node tools/check_vectors.mjs` loads. The page loads the copy under `js/playground/`. `tools/test_vectors.json` and `tools/check_vectors.mjs` and `tools/PLAYGROUND_SPEC.md` are the uploaded files, unchanged.

`settle` now defaults to K = 5 (integer, 2 through 64; K < 2 throws) and R = 1e-3. No caption on the page quoted K = 2. The sharpen sliders already take K and R off the composition, so a new pick arrives at 5 and 0.001. The reference orbits move with that: c = −1 settles at n = 8, period 2, and the rabbit settles at n = 12, period 3.

`node tools/check_vectors.mjs` is 57/57.

### Assembler v2, after the playground landed

`gh-pages` at `113761d` (pull request 11) was merged in. Then the assembler was replaced with Matrix Master's study/orbit-settle v2, byte for byte: `js/playground/playground.js` and `tools/playground.js` share sha256 `194d62e66c8207db2efaab799c61127f73c49804056167515be50621e280a555`. `tools/test_vectors.json`, `tools/check_vectors.mjs`, and `tools/PLAYGROUND_SPEC.md` are the uploaded files, unchanged. `node tools/check_vectors.mjs` is 65/65.

An omitted R in that `settle()` is now 4 px of the window, `4 * units_across / width_px` (0.025 on the default 4 units across 640 px). `R <= 0`, `R: null`, or a null window with R left out still means no clustering. A pick emits `r_px: 4`, not a world radius of 0.001. The playground page already passes the screen radius into `orbitUntil`, so the live disk was already 4 CSS pixels.

The station rule is stricter than this assembler, and it was left that way. `c = i` and `c = −2` Settle in `settle()` and Stay on the stations, at the same step and period. The stations clamp a typed K into 2..64. The assembler throws. That split is written under MX alignment in `REVIEW_LOG.md`.

## Batch — sphere, split, and the cusp that was still saying Settles

Branch `cursor/playground-sphere-split-6b79`, off `gh-pages` at `3044213` (pull request 12). The assembler grammar is unchanged. `js/playground/playground.js` and `tools/playground.js` were not edited.

### What was already there

The playground already had a Riemann sphere, a split layout, and a WebXR button. The gaps were the walk on the sphere, a tap that meant the same point on both panes, a level the learner could see before the next picture, and three leftovers from the film batch.

### Sphere

The playground sphere stays Y-up. The latitude shader already samples the plane as `(x, z)` with the north pole at `+Y`. The course helper in `js/core/three-view.js` uses Z as north. Switching the playground to that frame would paint the texture on the wrong hemisphere, so this batch does not.

`js/playground/sphere.js` lifts a plane point and puts an escaped walk on the sphere. The last sample of an escape is the north pole. A walk that only leaves the window stays at its last finite point, because that point is not infinity. The pole and the escape tip are polar orange. The walk is input green. A tap on the pole has no finite address, so it does not invent one.

If the latitude framebuffer is incomplete, the same field is baked on the CPU and given to the sphere as a texture. Headless Chrome's WebGL2 context did that: `bakeLat` returned null, and the sphere was an empty host until the fallback.

### Split, and the level the learner can see

`split-param` stays one bitmap: the set on the left, the parameter plane on the right, the same `c`. `split-sphere` is two hosts, plane beside sphere, with a hairline between them. A tap on either side is the same `z`. A drag that starts on the plane, when the gesture is drag-c, moves `c` and rebakes both. A drag that starts on the sphere orbits the sphere.

The grammar already unlocks `split-param` at walk (L2) and `sphere` / `split-sphere` at turn (L4). `pick()` was not retuned. The kicker names the open level as soon as the signals cross it, and says "· next" while the picture on screen is still the previous level. Seven `check` vectors cover the locks and the two open views. `node tools/check_vectors.mjs` is 72/72.

The sphere line names thread T1 and problem 2.5.1, and links the reciprocal station. Both splits name thread F2. The playground entry in `js/registry.js` still has `threads: []`, so it is not a Next stop.

### The three leftovers

`c = 1/4 + 1e-8` was Settles because the near-1 disk closed around step 63 and the 12000-step continuation ended before the escape at step 31414. `PARABOLIC_EXTRA` stays 12000, so the basilica still settles at step 208 and still pays only that continuation. A real positive climb toward 1/2 gets a separate lookahead of `CUSP_EXTRA` = 40000 steps, with no disk test. Escape in that look is Leaves, at the true step. The parabolic point `c = 1/4` exhausts the look and the first disk stands. `c = 1/4 + 1e-4`, `1e-5`, and `1e-7` are unchanged (312, 991, 9933). A walk with no `|f'|` still closes, which is the assembler cell.

The period-70 nucleus `c = −0.7468707761049912 + 0.13335830940823915i` is invisible to a 240-step probe capped at 32. On a disk of radius 0.07 the smallest return at step 800 is 26, and raising the cap would not replace 26, because 26 still fits. `ORBIT_PERIOD_MAX` stays 32. The cap sentence says the return is not the attracting period. The Mandelbrot and bulbs companion runs `criticalPeriod` for 4096 steps with `periodMax` 96, which names 70, and says so when the screen disk disagrees. Ordinary presets keep their periods under that longer probe.

The Leaving film says "once". The page said "after". The page now says "once". The mp4 was not re-rendered.

### WebXR

Enter VR still asks for a session only on the click. A stub where `isSessionSupported('immersive-vr')` is true and `requestSession` rejects leaves the sentence "No headset session. The shape stays in the void." and the next Begin still rolls a picture. No console error.

Not run on hardware: a real headset, hit-test placement, hand tracking, controllers, and immersive-ar.

### Citations that were not re-opened

Problem 2.5.1 is chapter 2, section title "The Reciprocal Transformation and Extended Complex Plane", from `js/data/problems.js`. The textbook HTML section number and the PDF page for that section were not opened. Figure 4.2.13's PDF page is still unchecked. The playground's Julia, Mandelbrot, and Newton pins are the ones already on those stations (§4.2, Example 4.2.16 [PDF Example 4.11], Example 4.2.1 [PDF Example 4.7]).

### Still residue

`c = 1/4 + 1e-9` still reads Settles. Its escape is past 40000 steps. `c = 1/4` itself still Settles, which is the parabolic point. `criticalPeriod` at 4096 steps still says period 1 for `c = 1/4 + 1e-8`, because the escape is step 31414. The companion does not use that probe for the fate: the walk has already left, so the line says the orbit of 0 left.

### The cusp is not Settles, and the neighborhood has a twin

The station walk now names `c = 1/4` before it would close a disk as Settles. A real start whose first step recovers `c` with `|c − 1/4| ≤ 1e-12`, and whose second step is the same `z² + c`, is `reason: parabolic`, multiplier 1. The sentence says the fixed point is 1/2, the orbit approaches and does not leave, a closed disk is the iteration limit, and a short watch is not Leaves. `c = 0.2499` is still inside and still Settles. `c = 1/4 + 1e-9` is still Leaves, reason cusp. The basilica is untouched. The assembler cell does not use this test. At `c = 1/4`, `z0 = 0.4`, `settle()` is still Settles, n = 50, period 1.

The diary badge uses the same words. Its old snap, `|re − 0.25| ≤ 1e-4`, called an attracting point the cusp. The snap is now `1e-12`.

L11 is the view `twins`. It is not named `split-twins`, because a name that starts with `split` is dropped when gpu is 0, and the phone draws this picture on the CPU. The opening is the seahorse valley, `c ≈ −0.7436 + 0.1318i`, span 0.045, with the Julia set of that c beside it. The copy chip jumps to the period-3 centre, the real root of `c³ + 2c² + c + 1 = 0`, near `−1.7549`, span 0.48, where a pinch finds the small cardioid. The Julia pane there is the airplane, and the caption does not call it a copy of the set of c. The book does not number the resemblance or the copy. Exercise 10 remains the main cardioid. Theorem 4.2.11 remains the one-piece test.

The set-of-c window follows a pinch toward the point under the pointer, and a drag of the ring keeps c in the middle 70% of the frame. The page remembers 48 pictures. `pick()` still scores the last 32.

### The assembler names the cusp, and a bulb shows its period

`settle()` now uses the same parabolic test as the station walk. At `c = 1/4`, a real start whose first steps are `z² + c` is `reason: parabolic`, not Settles. The critical orbit closes at n = 56, period 1. `z0 = 0.4` closes at n = 50. `z0 = 0.2` closes at n = 56. `c = 0.2499` still Settles. The basilica still Settles. `c = 1/4 + 1e-9` still Leaves, reason cusp.

L11 stays off the Story Map. The resemblance and the small copy are unnumbered, and the map already has the Mandelbrot set and the cardioid. On a phone the two panes stay side by side. The header gives the pictures the height, and the footer still holds the chips and the chapter sentence. The Julia pane stays centred on 0. It tightens only when the neighborhood is tighter than the seahorse span, and never past span 0.2.

L12 is the view `bulbs`. It is not a Story Map stop, and it is not a Next stop. The ordering of bulbs by rotation number, and the doubling along the real axis, are not numbered in the book. Touching a bulb lights the attracting cycle of the orbit of 0 on the Julia set, over the same 2.4 seconds as the diary roll. Theorem 4.2.20 [PDF Theorem 4.11] is period 1, the cardioid. Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10] name an attracting fixed point. Figure 4.2.13 [PDF Figure 4.6, page 114] draws the bulbs. Exercise 10 is the main cardioid. Theorem 4.2.11 [PDF Theorem 4.9] is the one-piece test. Exercise 8 is the real cusp. The page does not invent a number for the ordering or the cascade.

## Batch — from the plane to the circuit

Branch `cursor/plane-to-circuit-43c6`, off `gh-pages`. Three pictured stops and one new Test 1 thread, C1, “From the plane to the circuit”. The live router does not import `kit/`. These are custom modules under `js/stations/`, registered in `js/registry.js`. No film. The drag is the clock.

Citations are the 202 Updated Edition, flat numbers, from the extracted text. The HTML edition uses nested numbers for the same pages. Each AC station says that alias out loud so the Open link is not a false citation.

### phasor-current

1. The hand does one thing: drag the green point around the circle of radius I0, or press ωt = 0 or ωt = π/2.
2. The purple mark moves with that hand. It is the height Im(I*), the physical current.
3. The claim is true when the angle is near π/2, and false otherwise. At the peak, the physical current equals I0. Anywhere else, Im(I*) is not the whole length upward.
4. The picture is a custom plane: orange unit circle, ray, and arc; a dashed purple drop to the height; a purple segment for that height. Axes stay blue.

Section 5.4, Figure 5.9 (the LRC circuit), equations (5.42)–(5.46), printed pages 155–156. I* = I0 e^{iωt} and “the physical current is the imaginary part of I*” are the unnumbered sentences between (5.45) and (5.46). The HTML page numbers that figure 5.4.9 and those equations (5.4.11)–(5.4.15). In §1.1, printed page 8, the book notes that some engineers write j so i can stand for current. This site keeps the book’s i. Exercise 4 of §5.4 asks why Figures 5.8 and 5.9 came out the way they did. Figure 5.8 is the tangent mapping. The picture is the current in Figure 5.9. The solution is not worked.

### complex-impedance

1. The hand does one thing: drag the green point Z, or press Resistor, Inductor, or Capacitor. Three chips is the ceiling.
2. The purple arrow moves. It is E* = Z I*. The thin arrow straight up does not move. It is the fixed current I* = i.
3. The claim is true when Z is real and R is past 0.15, and false otherwise. Then voltage and current share a phase. A nonzero reactance turns E* off the current. A shorter real Z still points E* with the current, and the sentence says the resistor claim needs a longer Z. The origin has no voltage arrow.
4. The picture is a custom plane: a green leg for R, an orange leg for X = ωL − 1/(ωC), the purple voltage, and an orange arc from the current’s angle to the voltage’s angle. The fixed current I* is blue, the same blue as the axes. I* is fixed at its peak so the multiply is a quarter turn.

Same section, same figure, same printed pages. Equation (5.46) is E* = [R + i(ωL − 1/ωC)] I*. Z is that bracket, and E* = Z I* is the next unnumbered sentence. The imaginary part is one number. The picture does not split the inductor and the capacitor into two sliders. Exercise 17 asks for Z at two sets of R, L, C, and ω. The page points at the picture and does not compute those values.

### wave-phase

1. The hand does one thing: drag the green point around the unit circle, or press θ = 0 or Half turn.
2. The purple arrow moves. It is e^{iθ}ψ for a fixed wave ψ = 1.6. The dashed purple circle does not move. It is the length |ψ|.
3. The claim is true when θ is near 0, and false otherwise. A global phase of 0 leaves the phased wave on ψ. Any other turn moves it, and the length stays |ψ|.
4. The picture is the multiply-by-e^{iθ} move, with the phase on the unit circle and the wave on a longer circle. It is not a new theorem.

The book teases “the mysterious quantum world” in the Chapter 1 introduction, printed page 1, in the same sentence as fluid flow and electric circuits. It does not number a wavefunction. The source line says “PDF number not checked — intro tease only”. No quantum section number was invented.

### The thread

C1 is green, a hollow square, a solid line. It stops at addresses, arithmetic, staircase, and powers, then at the three new stations. It skips distance, roots, and every stop between powers and the circuit. A stop with no square is one the line skips. The home station’s own threads stay T1, T2, and T3. Test 1 is 24 stops.

### Left for later

Chapter 10 is in the book and is not on this map. Section 10.6 is two-dimensional electrostatics (contents, printed page 333). Section 10.7 is two-dimensional fluid flow (contents, printed page 340). Those stations are a later batch. This one does not draw them.

No film. A host clock would redraw a turn the drag already shows. No worked solutions for exercises 4 or 17. The playground still says “Test 1 is Chapters 1 to 3” in its own citations. Those sentences were left alone. The story-map footer and the Test 1 switch now name the §5.4 circuit as well.

## Homework pass — batch 1 (2026-10-26)

Branch `cursor/homework-ch4-hints-copy-md-a873`, off `cursor/playground-l21-crossing-3229`. Assigned set id `ch4-oct26`. No worked solutions on those cards. Films stay the ones already in `js/data/films.js`, looked up by `station`.

### Round 1 — Homework cards and the Homework filter

**Problem.** Exercises 4.1.3, 4.1.13, and 4.3.2 were not on the index. Exercises 4.2.3, 4.2.4, 4.2.5, and 4.3.1 were, and the last four of those seven showed a book or added solution. Shael had no way to see only the assigned set.

**Change.** Those seven cards carry `homework: 'ch4-oct26'`. `HOMEWORK_IDS` is `4.1.3`, `4.1.13`, `4.2.3`, `4.2.4`, `4.2.5`, `4.3.1`, `4.3.2`. Exercise 4.3.1 keeps id `4.3.1` and records `assigned: 'b'`. The statement still quotes (a) and (b). `book` and `added` on the set are null. Each card has a hint that names the stop (and the film, when `filmsFor(station)` has one). Disk and Geometric Series have no film, so 4.2.4, 4.3.1, and 4.3.2 do not invent one. 4.2.4 also points at Julia. 4.2.5 also points at the Mandelbrot set and The Crossing. 4.3.2 also points at A Radius, Then a Wall. The index gained a Homework chip. Choosing it sets scope to Any and shows the set. A homework card shows the hint in the open and has no Show button. Geometric cards stay Likely until the station pass. Theorem 4.1 and Definition 4.1 are page 103 in the 202 Updated Edition. Theorem 4.9 is page 113. Theorem 4.12 is page 118. The ε/2 half of Theorem 4.1 is already written in the book. Exercise 13 is the imaginary half of the first direction, so the hint does not call that half an ε/2 argument.

**Verified.** `node tools/fractal-smoke.mjs` exits 0. 30 problems. Core groups are six A, four B, four C, nine D. The homework check matches `ch4-oct26`, empty book and added, and the film ids `settle`, `newton-walk`, `orbit`, or none.

### Round 2 — Copy Markdown

**Problem.** A learner needs a statement they can paste into an LLM with their own work, and the paste must not carry the answer key.

**Change.** `problemMarkdown` builds the clipboard body: pin, statement, book link, map stop, film when `filmsFor(station)` has one, extra stops from `also`, index hash, hint, a blank `## Your solution`, and a Check note. Homework uses the card hint. Every other card’s Hint section says to work it at the station hash and that the book print stays behind Show. The index puts Copy Markdown beside Tick. The label becomes Copied after a successful write, then returns.

**Verified.** `node tools/fractal-smoke.mjs` exits 0, including the export shape: 4.1.3 names A Sequence Has a Fate and The terms land, or they do not; 4.2.4 names the disk and Julia and does not invent a film line; 4.2.5 names the orbit film and The Crossing; 4.1.1’s export does not contain the printed `(a) $0$`; 4.2.3’s export does not contain “One step is enough”; 4.3.1’s export does not contain the closed form. Headless Chrome at 1280: Homework shows the seven cards `4.1.3, 4.1.13, 4.2.4, 4.2.5, 4.2.3, 4.3.1, 4.3.2`, scope Any, the 4.1.3 card has the hint and no book reveal, a trusted click sets the button to Copied, and the clipboard starts with the pin and includes the blank solution section.
