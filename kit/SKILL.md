---
name: study-site
description: >-
  Build a static math study site in the style of a story map: one course,
  one picture per idea, then the map, threads, flashcards, practice, and
  source tags. Use when the user asks for a study site, a course map, or
  "one like One Point, Two Addresses" for any math course. Draw the picture
  before filling the config row.
---

# Study site

Build one site the learner can stay inside. The map, the threads, the pictures, the flashcards, and the practice are the same course, not four apps that link to each other.

The reference is Test 1 of One Point, Two Addresses: one gesture on a page, a sentence the picture checks, a colour that means the same thing everywhere, and a map that shows how the stops belong together. Match that standard. Do not match its subject unless the course is complex analysis.

## Picture first

The picture is the work. The config is an index of pictures that already exist. An agent that fills `throughline`, `observe`, `threads`, and `source` has written a syllabus. A learner on that site watches titles, citations, and cards. After a night they can recite the lede. They have not seen the idea move.

You and the learner are looking at different things. You look at the picture, then the claim, then the citation, then the loop. The learner never sees the config, the research log, or this procedure. They see one mark move and one sentence change, then the colour of that mark, the card, and the exercise on that picture. A field that does not change their view is not the work.

Write these four lines in `RESEARCH_LOG.md` before you add a teaching station:

1. The hand does one thing: drag a point, or press one of two or three chips.
2. One mark on the page moves because of that.
3. The claim sentence is true of this state and false of another. It lives in `viz.claim` (`whenTrue` / `whenFalse`). `observe` is the instruction under the picture, and it may stay put. A claim that stays true wherever the hand is is a slogan.
4. The picture that draws it. `number-line` only when the sentence is about that one real number. `two-addresses` only when the sentence is about one complex point and its argument. `graph` when the sentence is about the output of a real function of x: the hand drags x, and the purple mark is the value. `shape` when the sentence is about a 2×2 matrix acting on a square: one parameter, green square in, purple square out, blue axes. The square sits in the first quadrant and one corner is marked, so a quarter turn does not land on itself. The hand drags the track under the square, not the square. `stretch` is `[[t, 0], [0, t]]` and stays a square. `stretch-x` is `[[t, 0], [0, 1]]` and is a square only at `t = 1`. `rotate` stays a square, so the claim is `near` and the readout's corner is the mark that moved. `shear` is the action where `image-square` flips. A reflection is still a square: use `samples` and `det-positive`, not a reading row. Anything else is a module you stamp, then draw.

Threads, the colour key, the card, and the practice problem attach that picture to the course. They come after the sentence agrees with the canvas.

A custom picture lives in `stations/<id>.js` beside the config. Stamp it, draw it there, and let scaffold copy it. The next `--force` rebuild copies that file again and discards an edit made only in the output folder.

## When to use

Use this skill when someone wants a beautiful study site for a math course or topic: a map that ties the ideas together, flashcards, questions with hints and answers, interactive pictures, and short intuition build-ups.

Do not use it for a single worksheet, a slide deck, or a page that only renders formulas.

## Decide. Do not ask.

Pick the taste, the integration, and the direction yourself. Write the choice and the reason in `RESEARCH_LOG.md`. Do not hand the user a menu.

These decisions are already made. Do not reopen them:

- **Four teaching colours, reused.** Blue (`--cart`), orange (`--polar`), green (`--input`), purple (`--output`). Map the course onto them: two readings of one object, the thing the learner moves, the thing that results. A new hue per chapter breaks the colour key.
- **One gesture per station.** The picture is the control. A chip may jump to a named example and stays pressed only while the value matches. Do not add a second widget that sets the same number.
- **At most three controls.** A preset chip beats a slider. Count the chips. Two is the aim and three is the ceiling. The scaffold rejects a fourth chip.
- **Threads earn a line.** Draw a thread when it crosses at least two stops and is not every stop. A single thread through the whole map is the map order. Do not draw it again as a badge.
- **Home teaches, then shows the map.** A finder, one picture, and the map, in that order. The finder searches stops, topics, and problems on the current map. That picture is the only control: no chips on it. `viz.picture` is `point`, `line`, or `shape`. `shape` is the square, and the hand drags the track. If you leave it unset, a site that has `two-addresses` gets the point, a site whose pictures are only `shape` gets the square, and every other site gets the line. A calculus home stays a line. A linear-algebra home is the square. Do not leave a matrix course on a number line. Topic chips still appear only when a map has at least six concepts. Fewer concepts means no chips. Do not invent topics to reach six. The map's columns and serpentine layout stay as they are. A thread line visits the stops on that thread, and skips the others. One lede per map.
- **Flashcards are one card at a time.** Practice is the list of questions. Hint and answer stay closed until the learner asks. No flip animation.
- **Do not fake a picture.** Built-in pictures are `two-addresses`, `number-line`, `graph`, and `shape`. `two-addresses` is one complex point: blue drops, an orange ray, and a sentence that changes on the seam. Use it only when that is the lesson. `number-line` is one real parameter: a green dot, orange ticks at the presets, and at most three chips that stay pressed only while the value matches. It does not show f(x). `graph` drags x and draws the output in purple. The function is data, not code: `fn` is `poly` with coefficients (constant term first), `abs`, or `arg`. `shape` applies one 2×2 to a square that sits in the first quadrant, with one corner marked. The axes are blue. `action` is `rotate`, `stretch`, `stretch-x`, or `shear`, or `samples` is two to four matrices blended by the parameter. Do not set both. `stretch` is the same factor on both axes. `stretch-x` scales only x. `image-square` stays true for every `rotate`, and for every `stretch` that has not collapsed, so that test is a slogan on those stations: use `near`, and read the corner in the readout. `image-square` flips on `shear` and on `stretch-x` away from `t = 1`. A reflection is still a square. Put it in `samples` and use `det-positive`. A projection collapses, so `image-square` flips. The readout says `square` or `not a square`. It also prints the determinant and the marked corner. The word smear is a claim you may write for a derivative. It is not the readout. The hand drags the track. A press on the handle keeps the parameter until the pointer moves. A press on the square does nothing. A lone arrow from the origin is not a fifth picture: that is `two-addresses` when the sentence is two readings of one point, and a custom module when it is not. On `graph` and `shape`, `observe` is the instruction under the picture. The sentence that changes is `viz.claim`, with `whenTrue` and `whenFalse`. A graph claim uses `op` `gt`, `lt`, or `eq` on the output. A shape claim uses `test` `image-square`, `near`, or `det-positive`. A claim that stays true on every chip is a slogan. The home line can use the same `op` claim on x. The home point changes its sentence on the negative real axis and keeps the angle in the readout. Anything else is a `custom` module. Stamp it with `node kit/stamp-station.mjs --id <id> --config <config>`, then draw the lesson in `drawLesson`. The module path is `./stations/<id>.js`, the same id as the station, and the file sits beside the config. Do not point `module` at a file you have not written, and do not leave the green dot as the lesson. The stamp prints `observe` as the instruction and `viz.claim` as the sentence that flips. It does not copy `observe` into that sentence. `kind: reading` is a placeholder for a stop whose picture is not drawn yet. It does not apologise, and it does not ship. A stamped file that still exports `STAMP_OPEN` is the same kind of unfinished stop. The scaffold lists both and still exits 0. A batch is not done while either list is non-empty: build the picture or cut the stop.
- **Relative URLs.** No `<base>` tag. The site must load on a GitHub Pages subpath.
- **Storage prefix `study:`** unless the config sets another one. Never reuse a prefix already used by a different site on the same origin.
- **The header mark stays** the small coordinate hook. It is not a course logo.

The only question you stop and ask is a textbook you cannot find, and only when the task did not tell you to choose one. See below.

## Inputs

Read the user's course, test names, topics, textbook, chapters, exercises, and the pictures they want. Fill `study-site.config.json` using `kit/study-site.config.example.json` as the shape. The example is MAT 412. It cites Howell & Mathews, *Complex Analysis*, at about 90% confidence. It is an example, not a book you paste onto someone else's course.

| Field | Meaning |
| --- | --- |
| `siteTitle`, `course`, `throughline` | Name, course, and the one idea the whole site teaches across every test |
| `maps`, `parts`, `threads` | The doors, the groups, and the stories that cross the stops |
| `stations` | Every place on the map, with `summary`, `observe`, threads, and `source` |
| `concepts` | Syllabus topics. Each one names the station that teaches it |
| `flashcards`, `problems` | Front/back cards, and questions with `hint` and `answer`. `answer` is `{ tex, text, values }` |
| `colourKeys`, `palette` | What each teaching colour means on each map. Palette values are hex tokens only |
| `textbook` | Title, authors, edition, HTML URL, PDF URL, licence, and `confidence`. Below 1, the note says what is still uncertain |
| `loop` | Optional caps: `reframeRounds` (default 3), `reframers` (default 3) |

`observe` is required on every station. It is the instruction under the picture, and it may stay put. The sentence that has to be false somewhere is `viz.claim`.

`throughline` is required, and it is one idea, in one or two sentences. The home picture is where that idea is true, and one drag makes the sentence false. The lede is a door into that idea. It may name the threads. It does not introduce a second idea. The learner reads the lede and the picture. They do not read the config. A second idea is the next map, and it does not go in this config.

## Textbook: the one time you stop

Every concept, station, flashcard, and problem carries a source: chapter, section, and (for a problem) exercise.

Before you write a station, a card, or a problem, name the textbook. Look in the user's message, the config, and the course materials they pointed at. A course handout counts when that handout is the text the course actually uses. A famous book you remember does not count.

If the task names the course and tells you to pick a free textbook, look one up, open the section, and cite that page. Set `confidence` below 1 and say in `note` what you did not see, such as the licence line. Paraphrase the prompt unless the licence lets you quote it. Do not stop to ask when the task already told you to choose the book.

If you cannot find a title you could cite, **stop and ask the user** for the title, the authors, the edition, and a URL or a chapter list. Do not invent a book. Do not invent section numbers. Do not write exercise text and label it as the book's.

`node kit/scaffold.mjs` exits **2** when `textbook.title` is missing, `TODO`, or a placeholder. That exit means ask. It does not mean pick a book and continue.

## Research and licence

- Prefer exercises the user supplied, or ones whose licence allows copying.
- Record both the HTML URL and the PDF URL when the book has both.
- Otherwise cite chapter, section, and exercise, and paraphrase the prompt.
- Quote a prompt only when the licence allows it, and then with the attribution that licence asks for. The example's line is "From Howell & Mathews, *Complex Analysis*, complexanalysis.org, CC BY 4.0." A different book uses the line its own licence asks for.
- Solve every answer yourself before it ships. Do not copy an answer you have not recomputed.
- Record the citation on the object (`source`) and on the page (the source tag). A card with no source does not ship.
- Keep a short note in `RESEARCH_LOG.md` of where each batch of problems came from.

The example cites Howell & Mathews, *Complex Analysis* (the free open edition, CC BY 4.0), at about 90% confidence. That paragraph is about the example, not about the next course. The Test 1 handout matches that book from 2.1 through 2.5 and from 3.1 through 3.2. On the reference site, Test 2 is the Chapter 4 map: sequences in 4.1, the Julia rule and Newton in 4.2, threads F1, F2, and F3, and the flat paper at `#paper`. It states the set of c and does not draw it. Sections 4.3, 4.4, and 3.3 are marked so they can be dropped. The example config is the pictured Test 1 slice only. It does not copy that map. Chapter 1 titles on the handout do not match the book's section titles, so those stations keep the handout's wording and say so in the source note. Exercise numbers in the example are the handout's, and the notes say that. 90% is not a licence to invent the next book. If a course has no title you could cite, stop and ask.

## Answers

A problem's `answer` is an object, not a string:

- `tex` is the answer a learner reads, prose with `$...$` around TeX.
- `text` is the same answer in plain text, with no `$` and no TeX commands.
- `values` is an object of named numbers a test can recompute. Use `{}` only when the answer has no number.

The scaffold rejects a string answer and rejects `answerText`. `node kit/smoke.mjs` recomputes the example's numbers: the product and quotient, the polar form, the fifth roots, a sample of z² + iz, and a finite-difference Cauchy-Riemann check. A new course does the same for its own numbers. Never ship an unverified answer.

## A different course

The example config is a finished pictured slice of this repo's course: the address plane, the argument graph, the roots, the quarter turn, and the derivative, plus the map, the cards, and the practice. It is not the MAT 412 syllabus. The other pictures live on the reference site, under `js/stations/`. Do not port that folder, and do not put those stops back into the example as `kind: reading`. Scaffolding the example gives you that slice. It does not give you Test 1. A second course is `kit/examples/linear-algebra.config.json`: four shape stations from David Austin, *Understanding Linear Algebra*, §2.6, and no reading row. Copy that shape for a course that is not this one.

The four tokens stay `cart`, `polar`, `input`, and `output`. The learner never has to see those names. `colourKeys` is where the course's words go. Do not write "Cartesian address" or "Arg" unless that is what the colour means on the page in front of the learner.

A finished first slice of another course is one batch of 2 to 4 pictured stations. It does not have a reading stop. "One picture" means each stop has one picture. It does not mean the slice has one stop. Leave the next section out of the config until you can draw it.

- A textbook you could cite, with chapter, section, and exercise on every concept and every problem.
- One throughline, one idea. The home picture makes that idea true, and one drag makes the sentence false. Each map lede is a door into it.
- Two threads that each skip at least one stop, so each earns a line. One thread through every stop is the map order. The line on the map visits the stops on the thread and skips the others, so do not put a thread on a stop it does not teach.
- On each stop, one `number-line`, `two-addresses`, `graph`, `shape`, or `custom` picture whose sentence the gesture checks. Preset chips are the intuition build-up: two or three states of the same picture, and a sentence that is true of one of those states and false of another. A sentence that stays true on every chip is a slogan. A build-up is not a second widget and not three paragraphs under a blank page.
- The exercise sitting on that picture.
- Flashcards, one at a time, each citing its section and linking to the station the card drills.
- A practice list. Hint and answer stay closed until the learner asks.
- A home picture of the throughline: `shape` with no chips when the course is a matrix, `line` when it is a real function, `point` when it is a complex point. The colour key's blue line has to be something drawn on that page. On a shape page, blue is the axes.

For a Calculus I slice, start from the number line, not the complex plane. Blue is the axis, orange is a value being approached, green is the dot, purple is a function value when a station actually draws one. The presets are the x-values the exercise asks about. The number line shows where the dot sits. It does not show f(x). If the sentence is about the output, use `graph`: drag x, purple value, `fn: "poly"` or `fn: "abs"`. A number line with a sentence about f(x) is a reading page that grew a dot. Three chips on a line are the build-up only when the sentence is about the dot. Use `arg` only when the sentence is about a jump in the principal angle; a polynomial cannot jump. A shaded area, a secant becoming a tangent, or two paths into a limit is still a custom station. A Linear Algebra slice is the four pictures in `kit/examples/linear-algebra.config.json`, from one section of a book you opened. `stretch-x` is the horizontal stretch. `stretch` is the dilation, and its claim is `near`, because the image stays a square. `rotate` is the quarter turn, claim `near`, and the corner in the readout is what moved. `shear` is the slide, and `image-square` flips. The home is that square with no chips. Do not open it on a number line. Do not draw a free vector as a second tool. An arrow from the origin is `two-addresses` when the lesson is two readings of one point. A reflection or a projection is `samples` plus `det-positive` or `image-square`, not a reading page. Neither course reuses the example's section titles.

## Architecture

The scaffold writes a static site:

```
index.html
css/theme.css          tokens, light and dark
css/components.css     shell, panels, chips, buttons
css/palette.css        hex overrides from the config
css/study.css          source tag, map, flashcard, plane
js/app.js              hash router, nav, theme, colour key
js/registry.js         pure lookups over the generated data
js/generated/data.js   the config, as a module
js/core/               theme, store, ids, katex, dom
js/components/         source tag, connective links, station chrome, problem card
js/stations/           home, reading, addresses, number-line, graph, shape, deck, practice, plus copied custom modules
vendor/katex/          copied from the reference repo when present
```

Custom pictures are not part of `kit/template`. They live in `stations/` next to the config. `module` is `./stations/<id>.js`. Scaffold copies that file to `js/stations/<id>.js` on every run, including `--force`. A missing file is an error. A file that still exports `STAMP_OPEN` is listed as unfinished and the command still exits 0.

`mount(section, ctx)` is the station contract. `section` is an empty element. `ctx` is frozen and carries `navigate`, `chooseMap`, `route`, `station`, `map`, `stations` (this map only), `threads`, `preset`, and `store`. Return an unmount function.

Hash routes:

- `#roots` opens that station
- `#problem-1-3-1` opens the station that owns exercise 1.3.1, with the hint open
- `#topic-T1-3` opens the station for that concept
- `#home-T2` opens the map that thread belongs to and dims every stop that thread does not cross. The legend on the map is those links. A thread that does not earn a line does not light.
- A station id in the hash forces that station's map. Home does not, except for a thread token.

Kind picks the module. You do not set `module` unless `kind` is `custom`.

| `kind` | Page |
| --- | --- |
| `map` | Story map. Exactly one |
| `flashcards` | One-card deck |
| `practice` | Question, hint, answer |
| `viz` + `two-addresses`, `number-line`, `graph`, or `shape` | Built-in picture |
| `reading` | Placeholder. What to look at, the map tie, the exercises. Not a finished stop |
| `custom` | `stations/<id>.js` beside the config. Stamp it, draw `drawLesson`, then delete `STAMP_OPEN` |

## Connective layer

A station that is not on the map does not ship.

Every station:

- lists the threads that pass through it (`threads`, or `threadsByMap` when a shared stop changes thread with the map)
- appears as a node on the story map, in `order`, inside its `part`
- ends with map previous / map next, and previous / next along each thread that actually earns a line
- shows a sentence that says where it sits (`tie`, or the sentence the shell writes)

The home map draws those threads as coloured paths through the stops on the thread. A stop the thread skips is not a vertex of that path. A stop that owns an exercise gets a dot on the map, and the dot opens that exercise. The colour key in the footer is per map, and it must describe the page the learner is on. Shape comes from the thread's `mark` (disc, ring, diamond), not from a thread id copied out of this course.

A flashcard links to the station it drills, on the front as well as the back. A problem on the practice list names its station and its threads. Deep links land on the teaching station, not on the index. The exercise sits on the picture that makes it obvious. Cards and problems follow the map of their station, so one test does not drill the other's exercises.

## Visual design

Follow the reference shell. Colours come from tokens. Type is the system serif for titles and the system sans for text. Touch targets stay at least `--tap`. The page has a skip link, a visible focus ring, and a theme that can follow the OS or be pinned.

On a phone the nav is a drawer. At `56.25rem` it is a sidebar. Nothing scrolls sideways at 360px, and touch drag works at that width. CSS motion follows `prefers-reduced-motion`. A preset chip beats a slider, and a station has at most three controls.

A station picture has one animation frame. The clock is `js/core/anim.js` in the template and on the reference site. `createFrame` is a paint. `createMotion` is a play button. `stop()` and `cancel()` drop a callback that was already queued, on unmount and on pause. Time steps use elapsed time. A gap longer than a frame, including a hidden tab, does not move the picture. While the tab is hidden, nothing is scheduled, and the picture resumes when the tab is visible. The control that starts a motion says Pause while it runs. A second click freezes the picture where it is and puts the resting label back. It does not jump to the end. `prefers-reduced-motion` steps instead of playing, and that step button does not say Pause. A paint is a finished picture: a drag may show one coarse frame per animation frame, and the status stays on that finished picture until the next finished picture replaces it. Pause or idle draws the full final picture, not a strip. The bitmap on screen matches the canvas backing store, so the blit is 1:1, up to the reference plane's long-edge cap of 1400 and a device pixel ratio cap of 3. The canvas is reset only when that size changes. Chips, keys, and pointer-up paint that final picture immediately. Pointer-move coalesces to the one frame.

A page is done when a learner can do the gesture and the sentence agrees with what they see. Cut a control that repeats another control. Cut a paragraph that repeats the lede. Cut a topic chip that opens the same page with a different heading.

The big picture wins. If a page teaches a side lesson, cut it or fold it into the throughline. On the reference site, Test 2 keeps the same four colours and does not talk about Arg. Blue is a landing that stayed, orange is a landing that left or a root pin, green is the plant, and purple is the third root. c is a hollow square, not a fifth colour. The thread bars are F1, F2, and F3. The words on `#paper` are settles, stays, leaves, and which root. On another course, write the key for the page the learner is on. Do not copy the Arg lines across, and do not copy those four fate words onto a page that does not show them.

## Source tags

`js/components/source.js` renders a `.source-tag` on every station header, every flashcard, and every problem. The text is the textbook title, the chapter, the section, and the exercise when there is one. The Open link goes to the section URL when the source has one, and otherwise to the book's HTML URL. Do not hide the tag on the back of a card. Do not leave it off the map. A concept carries the same chapter and section as the station it opens. The scaffold rejects a mismatch. A pitch that drops a source does not get built.

## The loop

Run these steps in this order. Do not skip a step and do not reorder them. Do not ask the user to choose among the options a step produces. The only stop-and-ask is a missing textbook, and that happens before this loop starts.

1. **Builder batches.** Do not build the whole course in one pass. A round is one picture a learner can drag: the sentence agrees with the canvas, one thread drawn honestly, the colour key told the truth, one exercise sitting on that picture. A config row with no picture is not a round. A batch is 2 to 4 rounds. Draw the picture beside the config (`stations/<id>.js` for a custom station), then scaffold and load the page. `--force` rebuilds from that file. An edit made only inside the output folder is discarded. After the batch, append `RESEARCH_LOG.md`: what you wanted the learner to see, what you cut, what you verified, every opinionated choice, and the citation on every new station, card, and problem (chapter, section, and, on a problem, exercise). Push. The reviewers start from that log and the running site. They do not start from the builder's scratchpad.

2. **Close reviewer.** A separate pass. Does the scaffold run? Do the routes load? Do source tags match the config, and do they match the book? Open the cited page. The chapter, the section, and the exercise have to be that page's. A tag that only matches the config can still be a false citation. When the number is the handout's, the note names the book's number. Do `answer.values` match a recomputation? Is the shell consistent: one header, one colour meaning, no console errors, no sideways scroll at 360px, assets on the subpath? Fix small breaks on the branch.

3. **Mid reviewer.** A separate pass. Would a learner feel the reference standard? One gesture, a sentence the picture checks, at most three controls, the map, the cards, and the practice in one place, threads tying the stops together? Thin reading pages are not done stations. The example has none. A reading row in a new course is not a waiver and not a way to cover the next section. Build the picture or cut the stop. A thread line that visits a stop the thread does not teach is the same failure.

4. **Wide reviewer.** A separate pass. Observe the observer. Name the throughline in one sentence. On each page, name the mark that moves and whether the sentence flips when it moves. That mark is what the learner is looking at. A page they can only read is not done. If the mark is a different idea, cut the page.

Each reviewer is a separate pass, after the builder, in that order: close, then mid, then wide. A reviewer decides, writes the choice and the reason, and aims every page at what the whole site teaches across tests. A reviewer does not ask the user.

5. **Reframe rounds.** After close, mid, and wide, zoom out. This is not another review of the same pages. It is a new organisation of the whole course. Do not start this step while scaffold still prints unfinished stops. A reading station, or a stamped module that still exports `STAMP_OPEN`, means the map is a syllabus, and a reframe of a syllabus is a new syllabus. When the pictures exist, each reframer starts from one question: what single motion, dragged for an evening, would make the throughline obvious, and which current stops are sentences about a motion the page does not show? Run at most `loop.reframeRounds` rounds (default **3**). Each round is recursive: the council's choice is the input to the next builder batch, and that batch goes through close, mid, and wide before another reframe starts. Do not stack reframe rounds back to back.

   Each round, in this order:

   1. Run `loop.reframers` independent reframers (default **3**, and never fewer than 2). Each one is a separate pass. Its prompt is the site, the throughline, and the question. It is not given the other pitches. If you are a single agent, write each pitch to its own file and do not open another pitch until all of the files exist. Do not revise an earlier pitch after you have read a later one. Each one asks whatever question actually nudges them, then pitches a radical reframe of all the knowledge: a new kind of map, graph, or coordinate system, or a new feeling or metaphor that organises the whole course. The aim is a pitch that would surprise the builder and the other reframers.
   2. A pitch says what the learner would look at, where every current station would sit, what would be cut, and the source tag each surviving station keeps. Write it to `REFRAME_LOG.md`.
   3. Each reframer reads the others and writes **one** rebuttal in `REFRAME_LOG.md`. The rebuttal says what the other pitch makes a learner look at, and where it drops the throughline or a source.
   4. A council reads every pitch and every rebuttal. It chooses one pitch or a synthesis. It writes the choice and the reason in `REFRAME_LOG.md`. It does not ask the user. It does not offer options.
   5. The next builder batch (step 1) prototypes that decision on the real site, in 2 to 4 rounds, verified in the browser, and logged in `RESEARCH_LOG.md`. Then close, mid, and wide run again (steps 2 to 4). Only then may the next reframe round start.

Stop a reframe early when the council finds that the new pitches are the same idea as the one already on the site, or the ideas get smaller instead of more surprising. That is convergence. Do not keep reframing out of habit.

The top-level `loop` object in `kit/mcp-tool.json` is this procedure: `batch_rounds`, `reviewers` in the order close, then mid, then wide, `reframe_rounds`, `reframers`, `reframers_independent`, `rebuttals_each`, `council` (one choice, then the next batch prototypes it, then the three reviewers run again), `citations` (chapter, section, and exercise), `unfinished_blocks_reframe`, `ask_user` false, and `ask_user_only_when` you cannot find a textbook the task did not tell you to choose. The config and the tool input use camelCase for the two caps only: `loop.reframeRounds` and `loop.reframers`. Do not put snake_case keys in the config. The scaffold stores the config's `loop` and does not read the caps. The agent does.

## Verify

From the repo that contains `kit/`:

```bash
node kit/scaffold.mjs --config kit/study-site.config.example.json --out /tmp/study-site
node kit/smoke.mjs
```

Smoke scaffolds the example under a `/math-viz/` subpath, loads it in headless Chrome, and checks the map, a source tag, the two-address picture, a flashcard, a hint, a worked answer, a 360px width, and a bad hash. The example is one pictured map. It also scaffolds `kit/examples/linear-algebra.config.json`, a fresh one-map config that is not the example, and it recomputes `answer.values`.

Also serve the folder yourself and walk one thread as a learner. A check that only reads the HTML is not enough.

Confirm:

- `npx http-server` (or any static server) from the output folder, never `file://`
- the address is a subpath, like `http://127.0.0.1:8080/math-viz/`
- no console errors
- no asset requests outside that subpath
- 360px width does not scroll sideways, on the map and on a picture

## Ship

On a static host, branch from the branch that serves the site (for the reference repo, `gh-pages`), commit the site, and open a pull request into that branch.

The kit itself lives in `kit/` and is not mounted by the reference site's router. Adding `kit/` must not change the live pages.

Do not force-push. Do not rewrite the live `index.html` as a side effect of scaffolding.

## Invoke

**Skill.** Tell the agent: "Use the study-site skill and make one like this." Give the course, the tests, the topics, the textbook (title and URL), the chapters, and the problems. The agent names each picture, stamps it or picks a built-in, then fills the config row, runs the scaffold, and builds in batches with reviewers and reframe rounds.

**Stamp.** For a picture the four built-ins do not draw:

```bash
node kit/stamp-station.mjs --id secant --config path/to/study-site.config.json
```

That writes `stations/secant.js` beside the config. Draw the lesson in `drawLesson`, delete the `STAMP_OPEN` line, and set the station to `kind: "custom"` and `module: "./stations/secant.js"`. Then scaffold. Do not edit the copy inside the output folder.

**Scaffold.**

```bash
node kit/scaffold.mjs --config path/to/study-site.config.json --out path/to/site
```

`--force` replaces an existing output folder. Exit 2 means stop and ask for the textbook.

**MCP.** `kit/mcp-tool.json` is the contract for `generate_study_site`. There is no server in this repo. Running the tool means writing the config and running `node kit/scaffold.mjs`. Call it with the config fields as the arguments: `siteTitle`, `course`, `throughline`, `textbook`, `maps`, `threads`, `stations`, and, once they exist, `concepts`, `flashcards`, `problems`, and `colourKeys`. Do not call it without a real `textbook.title`. `visualization` is `two-addresses`, `number-line`, `graph`, or `shape`. A different picture is `kind: "custom"` and `module: "./stations/<id>.js"`, a file you have already stamped beside the config. The call copies that file. It does not draw it. A missing file is an error. A file that still exports `STAMP_OPEN` is unfinished. The config's `loop` is camelCase (`reframeRounds`, `reframers`). Do not send `reframe_rounds` inside the config. The file's top-level `loop` is that procedure: independent reframers, one rebuttal each, a council that picks and is then prototyped, and citations by chapter, section, and exercise. `reframe_rounds` and `reframers` both default to 3. The call writes the folder. It does not run the batches, the reviewers, or the council.

**Smoke.**

```bash
node kit/smoke.mjs
```
