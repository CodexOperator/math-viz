---
name: study-site
description: >-
  Build a static math study site in the style of a story map: one course,
  tests, threads, stations, flashcards, practice with hints and answers,
  source tags, and one interactive picture per idea. Use when the user asks
  for a study site, a course map, or "one like One Point, Two Addresses"
  for any math course.
---

# Study site

Build one site the learner can stay inside. The map, the threads, the pictures, the flashcards, and the practice are the same course, not four apps that link to each other.

The reference is Test 1 of One Point, Two Addresses: one gesture on a page, a sentence the picture checks, a colour that means the same thing everywhere, and a map that shows how the stops belong together. Match that standard. Do not match its subject unless the course is complex analysis.

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
- **Home is the map.** One lede per map. Topic chips only when a map has at least six concepts, because then they are a finder. When there are few stops, the map is the finder.
- **Flashcards are one card at a time.** Practice is the list of questions. Hint and answer stay closed until the learner asks. No flip animation.
- **Do not fake a picture.** Built-in pictures are `two-addresses` (one complex point, two readings) and `number-line` (one real parameter). Anything else is a station you write, or a reading page that says what to look at. A reading page does not apologise for a missing canvas.
- **Relative URLs.** No `<base>` tag. The site must load on a GitHub Pages subpath.
- **Storage prefix `study:`** unless the config sets another one. Never reuse a prefix already used by a different site on the same origin.
- **The header mark stays** the small coordinate hook. It is not a course logo.

The only question you stop and ask is the textbook. See below.

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

`observe` is required on every station. It is the sentence that tells the learner what to look at.

`throughline` is required. Every map lede is a door into that idea, not a second course.

## Textbook: the one time you stop

Every concept, station, flashcard, and problem carries a source: chapter, section, and (for a problem) exercise.

Before you write a station, a card, or a problem, name the textbook. Look in the user's message, the config, and the course materials they pointed at. A course handout counts when that handout is the text the course actually uses. A famous book you remember does not count.

If you cannot find a title you could cite, **stop and ask the user** for the title, the authors, the edition, and a URL or a chapter list. Do not invent a book. Do not invent section numbers. Do not write exercise text and label it as the book's.

`node kit/scaffold.mjs` exits **2** when `textbook.title` is missing, `TODO`, or a placeholder. That exit means ask. It does not mean pick a book and continue.

## Research and licence

- Prefer exercises the user supplied, or ones whose licence allows copying.
- Record both the HTML URL and the PDF URL when the book has both.
- Otherwise cite chapter, section, and exercise, and paraphrase the prompt.
- Quote a prompt only when the licence allows it, and then with the attribution that licence asks for. For this book: "From Howell & Mathews, *Complex Analysis*, complexanalysis.org, CC BY 4.0."
- Solve every answer yourself before it ships. Do not copy an answer you have not recomputed.
- Record the citation on the object (`source`) and on the page (the source tag). A card with no source does not ship.
- Keep a short note in `RESEARCH_LOG.md` of where each batch of problems came from.

The example cites Howell & Mathews, *Complex Analysis* (the free open edition, CC BY 4.0), at about 90% confidence. The Test 1 handout matches that book from 2.1 through 2.5 and from 3.1 through 3.2, and Test 2 matches 4.2 Julia and Mandelbrot Sets, with sequences in 4.1. Chapter 1 titles on the handout do not match the book's section titles, so those stations keep the handout's wording and say so in the source note. Exercise numbers in the example are the handout's, and the notes say that. 90% is not a licence to invent the next book. If a course has no title you could cite, stop and ask.

## Answers

A problem's `answer` is an object, not a string:

- `tex` is the answer a learner reads, prose with `$...$` around TeX.
- `text` is the same answer in plain text, with no `$` and no TeX commands.
- `values` is an object of named numbers a test can recompute. Use `{}` only when the answer has no number.

The scaffold rejects a string answer and rejects `answerText`. `node kit/smoke.mjs` recomputes the example's numbers: the product and quotient, the polar form, the fifth roots, a sample of z² + iz, and a finite-difference Cauchy-Riemann check. A new course does the same for its own numbers. Never ship an unverified answer.

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
js/stations/           home, reading, addresses, number-line, deck, practice
vendor/katex/          copied from the reference repo when present
```

`mount(section, ctx)` is the station contract. `section` is an empty element. `ctx` is frozen and carries `navigate`, `chooseMap`, `route`, `station`, `map`, `stations` (this map only), `threads`, `preset`, and `store`. Return an unmount function.

Hash routes:

- `#roots` opens that station
- `#problem-1-3-1` opens the station that owns exercise 1.3.1
- `#topic-T1-3` opens the station for that concept
- A station id in the hash forces that station's map. Home does not.

Kind picks the module. You do not set `module` unless `kind` is `custom`.

| `kind` | Page |
| --- | --- |
| `map` | Story map. Exactly one |
| `flashcards` | One-card deck |
| `practice` | Question, hint, answer |
| `viz` + `two-addresses` or `number-line` | Built-in picture |
| `reading` | What to look at, the map tie, the exercises that live here |
| `custom` | Your module, still using the same header, source tag, and footer |

## Connective layer

A station that is not on the map does not ship.

Every station:

- lists the threads that pass through it (`threads`, or `threadsByMap` when a shared stop changes thread with the map)
- appears as a node on the story map, in `order`, inside its `part`
- ends with map previous / map next, and previous / next along each thread that actually earns a line
- shows a sentence that says where it sits (`tie`, or the sentence the shell writes)

The home map draws those threads as coloured paths. The colour key in the footer is per map, and it must describe the page the learner is on.

Deep links land on the teaching station, not on the index. The exercise sits on the picture that makes it obvious.

## Visual design

Follow the reference shell. Colours come from tokens. Type is the system serif for titles and the system sans for text. Touch targets stay at least `--tap`. The page has a skip link, a visible focus ring, and a theme that can follow the OS or be pinned.

On a phone the nav is a drawer. At `56.25rem` it is a sidebar. Nothing scrolls sideways at 360px, and touch drag works at that width. CSS motion follows `prefers-reduced-motion`. A preset chip beats a slider, and a station has at most three controls.

A page is done when a learner can do the gesture and the sentence agrees with what they see. Cut a control that repeats another control. Cut a paragraph that repeats the lede. Cut a topic chip that opens the same page with a different heading.

The big picture wins. If a page teaches a side lesson, cut it or fold it into the throughline. Test 2 of the reference site is still the same course: a point is a place a rule can start. Its colour key does not talk about Arg.

## Source tags

`js/components/source.js` renders a `.source-tag` on every station header, every flashcard, and every problem. The text is the textbook title, the chapter, the section, and the exercise when there is one. The Open link goes to the section URL when the source has one, and otherwise to the book's HTML URL. Do not hide the tag on the back of a card. Do not leave it off the map. A concept carries the same chapter and section as the station it opens. The scaffold rejects a mismatch. A pitch that drops a source does not get built.

## The loop

Run these steps in this order. Do not skip a step and do not reorder them. Do not ask the user to choose among the options a step produces. The only stop-and-ask is a missing textbook, and that happens before this loop starts.

1. **Builder batches.** Do not build the whole course in one pass. A round is one thing a learner can see: one station, one thread drawn honestly, the colour key told the truth, one exercise sitting on its picture. A batch is 2 to 4 rounds. After each round, scaffold or serve, and load the page. After the batch, append `RESEARCH_LOG.md`: what you wanted the learner to see, what you cut, what you verified, every opinionated choice, and the source of every new station, card, and problem. Push. The reviewers start from that log.

2. **Close reviewer.** Does the scaffold run? Do the routes load? Do source tags match the config? Do `answer.values` match a recomputation? Is the shell consistent: one header, one colour meaning, no console errors, no sideways scroll at 360px, assets on the subpath? Fix small breaks on the branch.

3. **Mid reviewer.** Would a learner feel the reference standard? One gesture, a sentence the picture checks, at most three controls, the map, the cards, and the practice in one place, threads tying the stops together? Thin reading pages are not done stations. Say which stop needs a real picture, then build that picture or cut the stop.

4. **Wide reviewer.** Observe the observer. Name the throughline. Does this page make the learner look at that, or at a different lesson? Cut what teaches something else.

Each reviewer is a separate pass, after the builder, in that order: close, then mid, then wide. A reviewer decides, writes the choice and the reason, and aims every page at what the whole site teaches across tests. A reviewer does not ask the user.

5. **Reframe rounds.** After close, mid, and wide, zoom out. This is not another review of the same pages. It is a new organisation of the whole course. Run at most `loop.reframeRounds` rounds (default **3**). Each round is recursive: the council's choice is the input to the next builder batch, and that batch goes through close, mid, and wide before another reframe starts. Do not stack reframe rounds back to back.

   Each round, in this order:

   1. Run `loop.reframers` independent reframers (default **3**, and never fewer than 2). They do not see each other's pitches first. Each one asks whatever question actually nudges them, then pitches a radical reframe of all the knowledge: a new kind of map, graph, or coordinate system, or a new feeling or metaphor that organises the whole course. The aim is a pitch that would surprise the builder and the other reframers.
   2. A pitch says what the learner would look at, where every current station would sit, what would be cut, and the source tag each surviving station keeps. Write it to `REFRAME_LOG.md`.
   3. Each reframer reads the others and writes **one** rebuttal in `REFRAME_LOG.md`. The rebuttal says what the other pitch makes a learner look at, and where it drops the throughline or a source.
   4. A council reads every pitch and every rebuttal. It chooses one pitch or a synthesis. It writes the choice and the reason in `REFRAME_LOG.md`. It does not ask the user. It does not offer options.
   5. The next builder batch (step 1) prototypes that decision on the real site, in 2 to 4 rounds, verified in the browser, and logged in `RESEARCH_LOG.md`. Then close, mid, and wide run again (steps 2 to 4). Only then may the next reframe round start.

Stop a reframe early when the council finds that the new pitches are the same idea as the one already on the site, or the ideas get smaller instead of more surprising. That is convergence. Do not keep reframing out of habit.

The top-level `loop` object in `kit/mcp-tool.json` is this procedure in snake_case: `reframe_rounds` and `reframers`. The config and the tool input use the same numbers in camelCase: `loop.reframeRounds` and `loop.reframers`. Do not put snake_case keys in the config. The scaffold stores the config's `loop` and does not read the caps. The agent does.

## Verify

From the repo that contains `kit/`:

```bash
node kit/scaffold.mjs --config kit/study-site.config.example.json --out /tmp/study-site
node kit/smoke.mjs
```

Smoke scaffolds the example under a `/math-viz/` subpath, loads it in headless Chrome, and checks the map, a source tag, the two-address picture, a flashcard, a hint, a worked answer, the Test 2 switch, a 360px width, and a bad hash. It also scaffolds a fresh one-map config that is not the example, and it recomputes `answer.values`.

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

**Skill.** Tell the agent: "Use the study-site skill and make one like this." Give the course, the tests, the topics, the textbook (title and URL), the chapters, and the problems. The agent fills the config, runs the scaffold, then builds in batches with reviewers and reframe rounds.

**Scaffold.**

```bash
node kit/scaffold.mjs --config path/to/study-site.config.json --out path/to/site
```

`--force` replaces an existing output folder. Exit 2 means stop and ask for the textbook.

**MCP.** The tool is `generate_study_site` in `kit/mcp-tool.json`. Its input is the config. The file's top-level `loop` is the procedure in snake_case (`reframe_rounds` and `reframers`, both default 3). The optional config field `loop` uses camelCase (`reframeRounds` and `reframers`). Calling the tool scaffolds the folder. It does not skip the batches, the reviewers, or the reframe council.

**Smoke.**

```bash
node kit/smoke.mjs
```
