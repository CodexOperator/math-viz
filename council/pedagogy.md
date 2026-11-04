# Council: pedagogy

Member: pedagogy. Aspect: the map, and how a student fills it in.

The book is Howell & Mathews, *Complex Analysis*, 202 Updated Edition. Every section below is one the site already cites. The prototype is Example 4.9, page 113.

## 1. Vision

Brilliant’s lesson is a short staircase, not a chapter. Each step is one blank. The picture does not move until the blank is right. A wrong blank gets one sentence and the picture stays put. The next blank uses the mark the last one just drew. When the last blank is right, that piece of the map inks, and the next piece becomes a door.

The Book roadmap is that staircase drawn at the size of the course. A chapter page is one flight: the nodes of that chapter, in the order the ideas depend. A node is one lesson of four to six blanks about one section. Ink is local and boring on purpose: every blank of that node correct once, stored in the browser. A node that lists another in `requires` stays locked until that other node is inked. The student can see the locked piece. They cannot open it from the chapter page.

The thing they are filling in is a set. Example 4.9 is the first set that later pictures reuse: the closed unit disk. Section 4.1 names the three fates of a sequence. Example 4.9 turns those fates into a region for the orbit of squaring. Theorem 4.12, if the syllabus keeps §4.3, puts a sum on that same disk. The Julia picture is what happens when the rule is no longer pure squaring. The map gets heavier, one inked region at a time, until a problem on the index is a region the student has already drawn.

The custom function is the student’s own rule, typed once. The parser already in `js/core/parse.js` compiles it. No `eval`. Every picture on the lesson draws that compiled function. The blanks of Example 4.9 stay about `z^2`, because that is the sentence in the book. Their rule is the purple orbit beside it. After the disk is inked, the same three words are said about their rule, and the sentence says the blue disk belongs to `z^2` only. That is the handoff to the next node: square, then slide.

## 2. Designs

Each design is one gesture, one mark, one claim. The gesture is typing a blank. The rule box is the second control, and Check becomes Pause or Step so the motion is not a fourth control.

### 2.1 The closed disk — built

Section 4.2, Example 4.9, page 113. Exercise 4 asks which starts stay bounded. The write-up stays on the index.

Page: `lessons/disk.html`. Six blanks. The plane is static: blue axes, an orange unit circle, a green start.

| Step | Blank | What moves when it is right | Claim |
| --- | --- | --- | --- |
| Square one point | the landing of 1/2, graded as the number 1/4 | a purple dot at 1/4 | The square of 1/2 is 1/4, closer to 0. |
| Which length is shorter? | `<` | the same dot, now compared with the start | One square of a point inside the circle steps inward. |
| Name the long list | settles | the orbit walks into 0, in blue | The start 1/2 settles at 0. |
| Outside the circle | leaves | the start is 3/2 and the orbit runs off, in orange | The start 3/2 leaves. |
| On the circle | stays | a non-real cube root of 1 swaps with the other, in blue | This start stays, and it does not settle. |
| Ink the disk | closed | the closed unit disk fills blue | The bounded starts are the closed unit disk. |

A wrong first blank (`1/2`, or `z^2`, or `2`) does not reveal 1/4 and does not move the picture. The hint stays closed until they open it. −1 is named in the last hint and in the “stays” sentence, because an open disk would leave it out, and because −1 settles while the cube root stays. The circle is not one fate. The filled set is still the closed disk, since both settles and stays are bounded. That is Example 4.9: the filled set is the closed unit disk, and the Julia set is the unit circle.

The rule box accepts anything `compile` accepts. `z^2`, `z*z`, and `zz` draw as the book’s rule. `z^2 + i/2` draws a dashed purple orbit from the same green start and does not change the blanks. After the disk is inked, the note names that orbit’s fate in 32 steps.

Mastery writes `mv:lesson-progress`. The slide node (`#julia`) is locked on this page until all six blanks are right, then the door is `index.html#julia`. The node after that, the set of c, stays locked. This page does not ink it.

### 2.2 A sequence has a fate — next lesson, not this one

Section 4.1, Definition 4.1, page 103. The station is `#sequence`.

This is a different list from Example 4.9. The sequence is `a, a^2, a^3, …`. The orbit above is `z, z^2, z^4, z^8, …`. Gluing them is how a student loses the night before the exam: `((1+i)/√2)^n` cycles, and the squaring orbit of that same point falls onto 1 and settles.

Gesture: type the comparison of `|a|` with 1, then one fate word. Mark: the powers of one green start, drawn only after the word is right. Claim: `|a| < 1` settles at 0, `|a| > 1` leaves, and `|a| = 1` needs a second look (the eighth roots stay on the circle). Four blanks. The node id is `4.1.fate`. It is on the roadmap and on the strip. It is not built, and the disk lesson does not require it yet. The moment that lesson exists, `4.2.disk` should list it in `requires`. Until then a lock would be a door with no key.

### 2.3 The same disk, as a sum

Section 4.3, Theorem 4.12, page 118. Scope on the site: likely. The station is `#geometric`. Drop the node if the syllabus drops the section. `nodesForChapter(4, { includeLikely: false })` already does that.

Gesture: type the closed form. The blank is a formula, graded by compiling both sides and sampling inside the disk, the same way `sameAsSquare` samples `z^2`. String match on `1/(1-z)` would refuse a student who typed `(1-z)^-1`. Mark: the partial sums, hidden until the formula matches on the sample. Claim: inside the unit disk the pile settles at `1/(1-z)`, and outside it leaves. The require edge is the disk node, because it is the same wall. Four blanks are enough: predict the sum at `1/2`, name the fate inside, name the fate outside, type the formula.

### 2.4 One Newton step

Section 4.2, Example 4.7, page 110. Five Newton steps from `1/4 + i/4` for `z^2 + 1` land on `i`. The station is `#newton-step`.

Gesture: type the next guess. The checker is the Newton map `z - (z^2+1)/(2z)`, evaluated by the parser, not a list of five stored answers. Mark: one new segment of the walk. Claim, said only at the fifth blank: the walk has landed on `i`. The rule box is the polynomial. A different polynomial redraws the target and the checker follows it, so the blanks stay honest. This node has no require edge from the disk. Newton is the other walk in the chapter. The chapter page should show it as a second path, not as step seven of the disk.

### 2.5 The current

Section 5.4, Figure 5.9, equations (5.42)–(5.46), printed pp. 155–156. The station is `#phasor-current`.

Chapter 5 is its own door. `5.4.current` requires nothing in Chapter 4. Gesture: type which part of `I*` is the physical current. Mark: the imaginary part, drawn only after the word `Im`. Claim: the physical current is the imaginary part of the complex current. Four blanks, on the picture the station already has. A custom function here is a distraction. Cut the rule box on this node. The phase drag is already the gesture of that station, and a lesson should not add a second way to set the same number.

### 2.6 The chapter page reads the roadmap

This is the plug for the Book roadmap the other build is drawing. It is not a new picture.

`js/core/progress.js` exports `ROADMAP`, `nodesForChapter`, `nodeState`, `inkFraction`, `markStep`. A chapter page lists `nodesForChapter(4)` or `nodesForChapter(5)`. For each node:

- `locked`: draw the circle, do not make it a link.
- `open`: link to `node.href` or `index.html#station`.
- `inked`: fill the circle with `--cart` and keep the link.

`inkFraction` is the partial fill while a lesson is in progress. The disk lesson’s strip is that drawing for four nodes: §4.1, the disk, square-then-slide, which c. The chapter page should use the same three states and the same store key, `mv:lesson-progress`. A second progress format would split the ink.

## 3. Technical approach

**KaTeX, already self-hosted.** `vendor/katex` is on the page today. `js/core/katex.js` renders with `trust: false`, a fixed macro map, and no network. The lesson uses that helper for the prompt, the reveal, and the compiled rule (`compile(src).tex`). MathJax would be a second engine, a second font download, and a second way to get a formula wrong. It does not earn a place.

**The parser is the function box.** `compile` in `js/core/parse.js` returns a closure. It never builds a string of code. The lesson smoke rejects `eval` and `new Function` in the three new modules. A bad name comes back as the parser’s own sentence (“I don’t know the name …”). The box is capped at 400 characters, which is the parser’s own ceiling.

**The fate word is a finite test, and the page says so.** Thirty-two iterations. A point whose modulus passes 8 leaves. A tail of eight landings with diameter under `0.01` settles. Anything else that stayed inside that radius stays. For the book’s three starts under `z^2` the words match the station: `1/2` settles, `3/2` leaves, the non-real cube root of 1 stays, and `−1` settles. `z^2+0.3` at 0 leaves, which is the critical orbit outside the cardioid. `exp(z)` at `1/2` leaves. A slower orbit can be called stays when a longer walk would leave. The note says “in 32 steps”. It is not a theorem, and it must not be copied into the Julia escape test. That test already has its own radius.

**One plane, one clock.** `createPlane` with `interactive: false`, so the picture does not pan, zoom, or drag. Range `[-2, 2]`, Cartesian grid, no legend. The book’s orbit is the only motion, driven by `createMotion` in `js/core/anim.js`. While it runs the button says Pause. A second press freezes it. A later press continues, and a finished run plays again from the start. Reduced motion does not say Pause: the same button says Step, and each press adds one landing. The purple orbit of a custom rule is a paint, not a second clock. On a phone the plane is capped at `16rem` so the blank sits with the picture. At 360px and at 1280px the page does not scroll sideways.

**Three controls.** The rule, the blank, and Check. Back and Next step are the station’s previous and next, the same kind of link every stop already has. The hint is a closed disclosure. There is no chip row.

**Storage.** `createStore('mv:')`, keys `lesson-progress` and `lesson-rule`. The rule is the source string, saved only when it compiles. Another picture that wants the student’s function reads the string and compiles it again. Progress is a boolean per step id. A value that is not `true` is dropped on read, so a corrupted store cannot ink a node.

**The prototype does not touch the registry.** `#julia`, `#disk`, and the index open as they do today. `tools/fractal-smoke.mjs` keeps its station list. The lesson is a page beside the map, linked from the strip and from “The disk stop”. The chapter page is where the lock should live. The hash stays a deep link for the night before the exam.

**Phone and paint cost.** One canvas, a circle, and at most eight orbit dots. No fractal fill, no second WebGL context. The checker is a few dozen complex multiplies. It is fine on a phone.

## 4. How this plugs into the other four

**The function pictures** (`z^2`, `e^z`, `log`, inverses). They should read `mv:lesson-rule` and compile it, and fall back to the station’s own formula when the string is empty or fails. The lesson has already paid for “one function, every picture”. A station that keeps a private chip list and ignores the stored rule splits the student in two. The disk lesson is the proof that one compiled closure can feed a dot, an orbit, and a sentence.

**Regions the student draws.** The inked disk is a set with a name: closed, radius 1, the bounded starts of `z^2`. A later drawing tool should be able to drop that set in as a preset once `4.2.disk` is inked, and should refuse to call the student’s scribble “the Julia set”. The lesson’s job is to make the first set mean something before anyone paints a quadrant.

**Two planes and the strings.** The pair this lesson can hand across is `(z, z^2)`, the green start and the purple landing, after the first blank. A string picture that draws before that blank has revealed the answer the lesson is withholding. Gate the string on the step, or start the string picture at the next node, where the reveal has already happened.

**Fractal zoom.** The slide door opens `#julia` and then gets out of the way. The 32-step word is not the escape test, not the deep zoom, and not the step-size complaint. Those belong to the fractal work. What this aspect owes that work is the sentence the student should already believe when they arrive: at `c = 0` the filled set is the closed disk, and a typed rule that is not `z^2` does not own that disk.

**Films.** A lesson step is not a film. The film stays on the station, with the station’s clock. Putting a Manim timeline inside a blank would be a second motion and a fourth control. Cut it from this aspect.

## 5. What to cut

Keep, if the synthesis is tight: the disk lesson, `progress.js`, the rule box, and KaTeX as it already stands. That is the whole idea in one page.

Cut, in this order:

1. **Locking station hashes.** A student on a new browser the night before the exam must still open `#julia` and the index. The lock is the chapter-page door and this lesson’s Next node. It is not the router.
2. **MathJax.** Already decided above. A second renderer is pure cost.
3. **Free-text explanations.** “Explain why” cannot be graded by the parser. It would become either a slogan we always accept, or a model call. Shael asked for deterministic mathematics. The blank is a number, a comparison, a fate word, or a formula.
4. **Dragging the start during a graded step.** The blank’s answer would move. The start is chosen by the step. Dragging belongs on `#julia`, after the node is open.
5. **A blank on every existing station in this pass.** Six hand-built lessons for Chapter 4 is the real cost. Each one is a step list and a checker, about the size of this prototype. Do the disk. Then §4.1, because confusing the sequence with the orbit is the expensive mistake. Then Newton’s five steps, because the checker is the same parser. Geometric only if §4.3 stays on the syllabus. The §5.4 lesson is a different chapter and can wait.
6. **Spaced repetition, streaks, and a server.** Ink is one boolean per blank. A review queue is a second product.
7. **Treating `a^n` and the squaring orbit as one node.** They share the word settles and they are not the same list. The roadmap keeps them as `4.1.fate` and `4.2.disk`.
8. **Copying the 32-step fate into the fractal renderer.** It will mis-name a slow escape. The Julia station already has a definition.

The prototype proves the staircase, the withheld picture, the parser, the ink, and the locked door. It does not prove a chapter page, because that page is the other build’s. The function it should call is `nodesForChapter`.
