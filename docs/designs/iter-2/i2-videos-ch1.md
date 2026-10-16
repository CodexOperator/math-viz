# Design: i2-videos-ch1

Goal `i2-videos-ch1` (iteration 2, wave 1, kind `video`, size M): two silent, captioned manim explainers for Chapter 1.
`two-addresses` (one dot, two ways to reach it, and why adding is easy in one address and multiplying in the other) and
`staircase-roots` (many names for one turn, and what powers, roots, principal values and branches do with them).

Owned files (the only ones this goal may create or edit): `videos/scenes/two-addresses.py`, `videos/scenes/staircase-roots.py`,
`media/narration/videos/two-addresses.json`, `media/narration/videos/staircase-roots.json`, and, automatically as in every goal, this
file, `tests/unit/i2-videos-ch1.test.mjs` and `tests/interact/i2-videos-ch1.mjs`. The renders (`media/video/*.mp4|.vtt`) and
`media/manifest.js` are produced by `tools/videos/render.mjs`: the builder runs it and leaves the outputs in place for the orchestrator to commit; nobody edits them by hand.

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md` ("Media track"), `docs/STORY.md` (0, 1, 4, 8, 10), `docs/ARCHITECTURE.md` (1, 11.4,
11.8), `docs/goals/iter-2.json` (entry `i2-videos-ch1`), `videos/lib/narrated.py`, `videos/lib/palette.py`, `tools/videos/render.mjs`,
`js/registry.js` (the `video` fields), `js/core/complex.js` (every number below is cross-checked with it), `js/core/listen.js` and
`docs/designs/iter-2/i2-media-core.md` (the panel that will show these videos), `tools/smoke.mjs` and `tests/interact/_helpers.mjs`
(how interaction scripts run), `tests/unit/i2-media-core.test.mjs` (house style for the unit test).

**Status of this design.** Nothing of this goal is built in the repo. To make the design implementable without guessing, a
**throwaway prototype of everything in it** was built in a scratch copy outside the repo (informational; it may not exist when you read
this, and this document is binding where they differ): both scenes (Appendices A and B are the validated files), both narration files
(section 4.3), the unit test (Appendix C) and the interaction script (Appendix D). Results: manim Community v0.22.0 with LaTeX renders both
scenes with no warning; `-ql`: `two-addresses` 159.87 s and 2.4 MB, `staircase-roots` 166.20 s and 3.9 MB; `-qm` (1280 x 720, 30 fps):
`two-addresses` 3.94 MB, `staircase-roots` 6.50 MB (section 8.2 has the render times); every `.vtt` has exactly one cue per segment with
the segment's text; the stills at each cue start + 0.5 s were looked at, all 17, and show what section 7.4 says; the unit test passes
11 of 11 results and fails for each of 12 deliberate mutations (section 7.2); the interaction script passes 4 of 4 (desktop and phone, both
routes) against a scratch copy of the site that holds the rendered files and the generated manifest.

---

## 0. Decisions, discrepancies, and differences from the plan

### 0.1 Decisions a builder or reviewer might otherwise trip over

| # | Decision | Why |
|---|---|---|
| D1 | **Every beat opens on its own picture within 0.3 s, then re-enacts the construction on top of it.** The first thing a beat does is `b.pop(...)`: it fades in the beat's finished picture (the marks A3 names) in `min(0.3, 0.02 t)` seconds; the narrated animation (a tracer arrow that turns and stretches, a plane that slides, a dot that crosses the seam) follows and never removes those marks. | A3 reads a still at **cue start + 0.5 s** and expects that beat's picture in it. A beat that built its picture over its first ten seconds would fail the check, and a viewer who scrubs lands on an empty frame. It also reads well: the answer is on screen, then the voice shows where it comes from. |
| D2 | **All timing is a fraction of the beat length `t`, scheduled by one helper, `Shots`.** `b.go(frac, length, *anims)` waits until `frac` of the beat has gone, then plays for `length` of it; `b.pop` is the only other play. `self.play` and `self.wait` occur nowhere else in the file (a unit test greps for it), the wait is capped at `0.5 t`, and `go` asserts `frac + length <= 0.97`. | A4 (no bare run time, no wait over `0.5 t`), and the audio re-render: `NarratedScene.beat_length` becomes the real clip length plus 0.35 s, so a scene built from fractions keeps its sync at any speaking speed. The assert is the guard that a shot never runs into the next beat and shifts every later caption. |
| D3 | **Digits are for degrees and for "length N"; every other number is a word.** "turn it 120 degrees", "stretch it to length 2", "72 degrees apart"; but "minus one plus i root three", "two pi over three", "root two", "one plus i". No symbol (`= ^ _ { } < > + * / \ $ #`) appears in any narration text. | A2 pins `120 degrees`, `length 2` and `72 degrees` literally, and the speech model reads digits for degrees correctly; `minus one plus i root three` is the pinned phrase of the first video and is spelled out for the same reason `i2-media-core` D11 gives (an operator read aloud is a coin toss). |
| D4 | **`staircase-roots` is one stage seen by a camera**, not nine pictures. `ValueTracker`s hold the camera elevation, the dot's angle and the seam; every part of the stage is an `always_redraw` that reads them; fading a part means animating its entry of `self.vis`, never `FadeIn` on the part (an `always_redraw` rebuilds its mobject every frame, which undoes a fade). | Looking straight down shows the plane, where only the dot is visible; lowering the camera lifts the staircase of names out of the dot. That is the story's own picture (z is the dot on the floor, arg z is the staircase above it) and it lets one drawing serve `set`, `home`, `jump`, `power` and `branch`. |
| D5 | **The staircase is a pole with step bars, not a floating helix.** A pole stands on the origin (the branch point); at the height of each name of the dot's angle a bar runs from the pole to the circle in that direction, so the bars of one dot stack in one direction and their tips stand directly over the dot; a thin helix hangs on the tips as the handrail. The home window is a bracket on the pole. | A free-standing helix reads as a stack of rings (the first prototype did). Bars on a pole read as a spiral staircase, show the window as "one flight tall", and make the jump visible where it happens: the highlighted bar leaves the top of the bracket and a different one enters the bottom. |
| D6 | **Height convention `hgt(theta) = theta / 360 + 1.0` turns above the floor** (`H0 = 1.0`). The floor is the level of angle -360, so the steps -240, 120, 480, 840 of the dot all stand above the floor and above the dot; the step -600 goes down through the floor, drawn faint. | A3 asks for "at least three names (120, 480, -240 degrees) above the dot". With the floor at angle 0 the step -240 sits below the floor (the first prototype), and the narration says "above the dot stands a staircase". The constant is a convention of the drawing; no number on screen depends on it. |
| D7 | **A frame hides what slides or grows past the plane**: `Cutout(big rectangle, panel rectangle)` filled with `BG`, z-index 10; plane marks are below it (z < 10), the card and its text above it (20 and 21). | The `add` beat slides a lattice by `(2, -1)` and the `mul` beat turns and stretches a whole polar lattice by `sqrt 2`; both leave the panel. A frame is simpler and cheaper than clipping every mobject. |
| D8 | **A `DecimalNumber` that updates every frame puts its digits back above the card in the same updater** (`.set_z_index(21)` after `set_value`). | `set_value` builds new digit mobjects at z-index 0, which the card (z 20) then covers: in the first prototype the live numbers showed on frame one and vanished. |
| D9 | **`wrap_to(deg, lo)` in the scene is `branchArg` of `js/core/complex.js` in degrees**: the representative of `deg` in `(lo, lo + 360]`; the window is closed at the top. A unit test runs the function with `python3` and compares it with `branchArg` on 14 cases. | One rule decides Arg (`lo = -180`, the negative real axis is +180), the branch of 2.4.1 (`lo = 0`) and the jump detector; the video must agree with the site's `branchRoot`. |
| D10 | **The scenes use only what ships with manim and `lib.*`**; no new file under `videos/lib/`, no font file, no image, nothing written except by `NarratedScene.tear_down` (the `.vtt`) and `render.mjs`. The small helper `Shots` is repeated in both files. | `videos/lib/` belongs to `i2-media-core`; D10 of that design lists what it offers (`mix`, `ramp`, 13 colours). The two copies of `Shots` are 25 lines each and are checked by the same unit test. |
| D11 | **The narration files are final scripts, written for the ear**, 393 and 413 words (about 160 and 168 s at the recipe's 2.5 words per second). The word budget is the binding constraint: 450 words is 180 s plus 0.35 s per beat, so 450 would already overrun the 180 s of A1; the texts stop at about 410. | A1: "ffprobe gives 120 to 180 s"; `beat_length` is `max(1.5, words / 2.5) + 0.35`, so the length of a video is `sum(words / 2.5 + 0.35)`. |

### 0.2 Discrepancies in the goal text, and how this design resolves them

| # | Discrepancy | Resolution (binding for the builder and both reviews) |
|---|---|---|
| S1 | A2 says the two-addresses text "mentions '120 degrees' and 'length 2'" and offers either spelling of the dot's name ("minus 1 plus i root 3" or "minus one plus i root three"). Digits and words are mixed in those pins. | D3: digits for degrees and `length N`, words for the rest. The first video says `minus one plus i root three` (twice), `120 degrees` (three times) and `length 2` (three times); the unit test accepts either spelling of the dot's name and requires the other two literally. |
| S2 | A3 for `cart` says labels "x = -1 and y = sqrt 3", for `polar` "r = 2 and theta = 2pi/3", for `euler` "e^{i theta} = cos theta + i sin theta". These are descriptions of what a reader sees, not strings in a file. | The scene writes them in LaTeX: `x=-1`, `y=\sqrt{3}`, `r=2`, `\theta=\tfrac{2\pi}{3}=120^\circ`, `e^{i\theta}=\cos\theta+i\sin\theta` (section 2.5 lists every on-screen string). |
| S3 | A3 for `set` says "a vertical list or spiral of at least three names ... above the dot", and for `jump` and `branch` "compare the still at the cue start and one 2 s later". The stills the review takes are at cue start + 0.5 s, so "the cue start" is that still and "one 2 s later" is cue start + 2.5 s. | D6 for `set`. For `jump` and `branch` the schedule is built so that the highlighted step (jump) and the seam ray (branch) differ between **cue start + 0.5 s and cue start + 2.5 s**: section 7.4 lists the two readings of each (the dot at 129 degrees with home name 129, against the dot at 200 degrees with home name -160; the seam at -179 degrees, on the negative real axis, against -92 degrees, pointing down) and the extraction command takes both. |
| S4 | A1 says the `-qm` render is run "once at the end" and the sizes checked, "or, when the session cannot afford it, the -ql file is under 4 MB and the design note says the -qm size is untested". | Both were measured here (header and section 8.2): the `-ql` files are 2.4 and 3.9 MB, the `-qm` files 3.9 and 6.5 MB (decimal megabytes; the 15 MB bound is 15 000 000 bytes). The builder still runs `-qm` once at the end and records the sizes; 15 MB is not at risk (the budget in 8.2 explains why). |
| S5 | The goal's `interfaces` line says "run_times as fractions of t" and A4 says "no `self.wait` longer than `0.5 t` inside a beat". A beat's last shot must leave a pad, but `NarratedScene.beat` pads only the shortfall. | D2: shots end by `0.97 t`; the pad is the rest (about 0.5 s at 18 s). A shot that started late because an earlier one was rounded up by a frame cannot push a cue, because `Shots.at` schedules against the beat's own clock, not against the previous shot. |
| S6 | A2 says the registry's station "whose video field is the id" (singular). `js/registry.js` lists `two-addresses` on **two** stations, `home` and `addresses` (`video: 'two-addresses'` on both). | The JSON's `station` is `addresses` (A2 and the goal text say so). The unit test reads the registry, checks the list of hosts is exactly `['home', 'addresses']` for the first video and `['staircase']` for the second, and checks the JSON's station is one of them. |
| S7 | The goal asks for stills that show "the dark theme (#0d121c-like)". The palette module is the dark theme, so every frame is, but a `Cutout` frame and card colours are also dark. | The review reads the corner pixel (4, 4) of every still: `(12, 17, 27)` at `-ql`, within 4 of `(13, 18, 28)` = `BG`. Section 7.4 gives the command. |

### 0.3 Differences between ARCHITECTURE / STORY and the code on disk (the code wins)

- `videos/lib/palette.py` already holds the 13 dark tokens plus two helpers (`mix`, `ramp`), as `i2-media-core` D10 says; ARCHITECTURE 11.4
  lists the same 13 names. The scenes use 9 of them (`BG`, `SURFACE`, `INK`, `MUTED`, `CART`, `POLAR`, `SEAM`, `WARN`, `OK`); `INPUT`, `OUTPUT`,
  `T0`, `T1` belong to the mapping videos.
- `videos/lib/narrated.py` reads `self.renderer.time` (the manim 0.22 `Manager` renderer) and the scenes use the same attribute; `beat`
  yields the length `t` **including** the 0.35 s pad, so the speaking time is `t - 0.35`. Section 5.3 turns the narration into beat fractions with it.
- STORY section 8 describes `jump` as "drag the dot round the origin". A video cannot be dragged: the dot moves by itself and the voice says
  "the dot goes once around"; the site's `staircase` station is where the student drags.
- STORY section 8 lists the V1 `add` and `mul` beats without numbers. This design uses `z + (2 - i)` and `z (1 + i)`, whose results
  (`1 + (sqrt 3 - 1) i`, `2 sqrt 2` at 165 degrees) are readable on a small plane. The review problem 1.1.1 (`(3 - 2i)(-1 + 4i)`) appears in
  the `rule` beat, where its answer `5 + 14i` is one line and its polar check `sqrt 13 · sqrt 17 = sqrt 221` is another; its product is 14.9 from
  the origin and cannot share a plane with the arcs (the same reason STORY gives for the two-scale picture in `arithmetic`).
- STORY section 8 gives V2 `roots` only the fifth roots; the goal's `assignment_refs` also list 1.4.2, so the fourth roots of -16 close the
  `roots` beat (one sentence, one picture).

---

## 1. Goal restatement, story thread, problems and topics covered

**Goal.** Two rendered, captioned, silent 720p videos of 2 to 3 minutes, each under 15 MB, with narration written for the ear, so that
the first two lines of the spine exist as film before the student's own audio run: *a complex number is a move* (Cartesian says where it sits,
polar says the move that makes it; adding slides, multiplying turns and stretches) and *a turn has many names* (arg z is the staircase,
Arg z the home step, z the dot on the floor; powers ignore the name, roots need all of them, the principal root stands on the home step,
a branch is a continuous choice of name and the seam is where it must jump).

**Story thread carried and how it shows on screen.**

| Spine line | Video and beats | The recurring picture |
|---|---|---|
| 1. A move | `two-addresses`: `intro` the dot, `cart` the slide (blue), `polar` the move (orange), `same` both on one dot, `add` the plane slides, `mul` the plane turns and stretches, `rule` which address, `euler` the dictionary | One dot, drawn once, in `INK`. Blue (`CART`) for drop lines, axes, grid and the word "slide"; orange (`POLAR`) for ray, arc, circles and the words "turn" and "stretch". A tracer arrow replays the construction on top of the finished picture. |
| 2. Many names | `staircase-roots`: `intro`, `names` (120, 480, -240 degrees), `set` (arg z), `home` (Arg z), `jump` (the seam), `power` (any name), `roots` (all the names), `principal` (the home name), `branch` (a continuous name) | One stage and a camera. From above: the plane and the dot. From the side: a pole on the origin, a bar at each name of the dot's angle, all pointing at the dot, a bracket on the pole for the home window, a dashed seam on the floor. |

**Review problems and topics covered** (the goal's `assignment_refs`):

| Ref | Where | What is on screen and said |
|---|---|---|
| 1.3.1 polar and exponential form of -1 + i sqrt 3, Arg | `two-addresses` `intro`, `cart`, `polar`, `same`, `euler`; `staircase-roots` `home` | The dot at (-1, sqrt 3); r = 2; theta = 2pi/3 = 120 degrees; 2(cos 120 + i sin 120) = 2e^{i 2pi/3}; Arg z = 120 degrees, the one name in (-180, 180]. |
| 1.1.1 z1 z2 and z1/z2 for 3 - 2i, -1 + 4i | `two-addresses` `add`, `mul` (the slide and the move on a readable pair), `rule` (the problem itself) | `(3 - 2i)(-1 + 4i) = 5 + 14i` in Cartesian; the polar check `sqrt 13 · sqrt 17 = sqrt 221 = abs(5 + 14i)`; "small whole numbers can go either way". |
| 1.3.2 (sqrt 3 + i)^10 | `staircase-roots` `power` | z = 2e^{i 30 degrees}; 10 x 30 = 300; 10 x 390 = 3900 = 300 + 3600; 10 x (-330) = -3300 = 300 - 3600; z^10 = 1024 e^{-i 60 degrees} = 512 - 512 sqrt 3 i. |
| 1.4.1 5th roots of unity | `staircase-roots` `roots` | Names 0, 360, 720 ... divided by 5: 0, 72, 144, 216, 288 degrees; five dots 72 degrees apart; step five is step zero again. |
| 1.4.2 4th roots of -16 | `staircase-roots` `roots` (last shot) | Four dots at length 2 and 45, 135, 225, 315 degrees; `sqrt[4]{-16} = 2e^{i(45 + 90k)} = ±sqrt 2 ± sqrt 2 i`. |
| 2.2.2 principal (2i)^{1/2} | `staircase-roots` `principal` | w = 2i: length 2, Arg 90 degrees; root two at 45 degrees = 1 + i (emphasised); the other root -1 - i (ghosted) from the next step up. |
| 2.4.1 branch of z^{1/3} continuous on the negative real axis | `staircase-roots` `jump`, `branch` | The home name jumps at the negative real axis; the seam slides to the positive real axis, the window becomes (0, 360]; -1 has name 180 and cube root angle 60 degrees: e^{i 60} = 1/2 + (sqrt 3 / 2) i. |
| T1.1 algebraic properties | `two-addresses` `add`, `mul`, `rule` | Adding adds the x parts and the y parts; multiplying adds angles and multiplies lengths. |
| T1.3 polar representation | `two-addresses` all beats; `staircase-roots` `names`, `set`, `home` | (r, theta); arg versus Arg; Euler's formula; geometric meaning of multiplication. |
| T1.4 powers and roots | `staircase-roots` `power`, `roots` | Powers do not care which name; roots need all of them. |
| T2.2 power and root functions | `staircase-roots` `power`, `principal` | The tenth power; the principal square root. |
| T2.4 branches | `staircase-roots` `jump`, `branch` | The seam, the window, the jump, a continuous choice. |

Section 6 gives every one of these in **both** the Cartesian and the polar address, with the numbers hand-checked and the same numbers as unit-test
expectations.

---

## 2. UX

A video has no controls of its own: the page's video panel (`js/core/listen.js` `videoPanel`, built by the stations) provides the player. This
section therefore has two halves: what a viewer does with the player, and what is in the frame.

### 2.1 Where the videos appear (built by other goals; the contract this goal meets)

| Video | Station panels (`video` field of `js/registry.js`) | Panel id and heading |
|---|---|---|
| `two-addresses` | `addresses` (after its first picture) and `home` (offered first) | `section#video-two-addresses`, `Watch (2-3 min): One point, two addresses` (the dash is an en dash) |
| `staircase-roots` | `staircase` (after its first picture) | `section#video-staircase-roots`, `Watch (2-3 min): The staircase: many names for one turn` |

The panel exists only when `media/manifest.js` lists the video; before the render, and in the iteration-1 state, the stations show no panel and
nothing breaks (`i2-media-core`, section 2.2 "Empty states"). At design time `js/stations/addresses.js` and `js/stations/staircase.js` already
build these panels (the interaction script of Appendix D found them in the scratch copy), so this goal's deliverable is the files they play.

### 2.2 Wireframes of the frame (16:9; screen units, 14.22 wide by 8 tall, origin at the centre)

**`two-addresses` (every beat except `rule`).** The plane at the left, the card at the right; the kicker above the plane.

```
 x = -7.11                                                                                   x = +7.11
 +----------------------------------------------------------------------------------------------+ y = +4
 |      One point, two addresses      (kicker, MUTED 30, at y = 3.45)                           |
 |  +----------------------------+   +-------------------------------------------------------+  |
 |  |  Im                        |   |  Cartesian address            (title, bold 36)        |  | y = +2.6
 |  |   |                        |   |  (x, y) = (-1, sqrt 3)        (card line 0, y = 1.45) |  |
 |  |   |  z                     |   |                                                       |  |
 |  |   |  . - - - y = sqrt 3    |   |  z = x + iy = -1 + i sqrt 3   (line 1, y = 0.47)      |  |
 |  |   |  :                     |   |                                                       |  |
 |  |---+--:----------- Re       |   |  a slide: left 1, then up sqrt 3   (line 2)           |  |
 |  |   |  x = -1                |   |                                                       |  |
 |  |   |                        |   |  blue = Cartesian: ...        (legend, line 3.4)      |  |
 |  +----------------------------+   +-------------------------------------------------------+  | y = -3.4
 |   plane panel 6.9 x 6.0, centre (-3.3, -0.2)    card 6.3 x 6.0, centre (3.75, -0.2)            |
 +----------------------------------------------------------------------------------------------+ y = -4
```

`rule` drops the plane: the header at y = 3.3, two boxes (6.5 x 3.3, centres (-3.65, 1.0) and (3.65, 1.0)) with the Cartesian list at the left
(blue border) and the polar list at the right (orange border), a curved double arrow and "do the work there, then translate back" under them,
and the 1.1.1 example in two columns at y = -2.9.

**`staircase-roots`.** One taller panel at the left (7.0 x 7.2, centre (-3.4, -0.1)) holding the stage, the card at the right (6.4 x 7.2).

```
 +----------------------------------------------------------------------------------------------+
 | +-----------------------------+    +--------------------------------------------------------+ |
 | |   480 deg  o  (bar to pole)  |    |  Arg z: the home step                (title)           | |
 | |   120 deg  O  <- home bar    |    |  Arg z in (-180 deg, 180 deg]                          | |
 | |   -240 deg o        | pole   |    |  Arg z = 120 deg                                       | |
 | |       z (dot) . ....|[ ] <- window bracket on the pole, "180 deg ]" top, "-180 deg (" bottom | |
 | |   ~~~~ floor ellipse ~~~~~~  |    |  Arg z is one number                                   | |
 | |   - - - seam (negative real axis, dashed, SEAM)     |  arg z is all of them                   | |
 | +-----------------------------+    +--------------------------------------------------------+ |
 +----------------------------------------------------------------------------------------------+
```

Looking straight down (`intro`, `names`, `roots`, `principal`) the pole and bars collapse to the origin and the picture is the plane: the
circle of interest (always the same screen radius, 2.3), the axes, the dot, the arcs.

**Phone (390 px).** The panel is 358 px wide and the player 324 x 182 (`i2-media-core` 2.2 C), a scale of 0.253 against the 1280 px frame. Every label
that a beat's sentence depends on is therefore drawn at 8 to 11 px high on the player: `MathTex` font size 42 to 48 for in-plane labels, `Text` 32 to
36 for titles, 28 to 30 for legends (6 to 7 px; legends repeat the voice and are the only text allowed below 8 px). The captions carry the whole
text, and fullscreen is one tap. Nothing in the frame depends on colour alone: every coloured mark has a label (`x = -1`, `r = 2`, `120°`).

### 2.3 Controls, ids, pointer, touch and keyboard

The video has no element of its own. The elements around it are built by `listen.js` (`i2-media-core` 2.3) and carry these ids, with `<id>` the video id:
`section#video-<id>` (the panel, with `data-video`, `data-state`, `data-narrated`), `h2#video-<id>-title` ("Watch (2-3 min): <title>"), `p#video-<id>-summary` (the manifest summary, the length, then "Silent, with captions" or the narrated variants),
`video#video-<id>-player` and `p#video-<id>-error` (hidden until the file fails). The player is the browser's (`<video controls playsinline preload="metadata">` with `<track kind="captions" default>`,
built by `listen.js`): Tab reaches it; Space or K plays and pauses; left and right arrows seek; up and down change the volume; M mutes; F is fullscreen; tapping
the frame plays and pauses. Captions are on by default. The scenes add nothing to this, never autoplay and never loop (the interaction script asserts it).

### 2.4 Empty, loading and error states

| State | What the viewer sees | Owner |
|---|---|---|
| Not rendered (no manifest entry) | no panel at all | `listen.js` |
| Loading | the player's own poster-less loading state; `preload="metadata"` fetches the header only | browser |
| File missing or not decodable | the panel's line "The video did not load. Everything else on this page works without it." and the player hidden | `listen.js` |
| Silent (the state this goal delivers) | the picture runs and the captions are the narration; the summary line says "Silent, with captions" | `listen.js` |
| Narrated (after the student's audio run) | the same, with the voice; the beats stretch to the clips (D2) | `NarratedScene` |

In the build harness's Chromium (no H.264 decoder) the panel is in the error state; the interaction script knows and skips the 16:9 and metadata steps there
(section 7.3).

### 2.5 Copy

**The narration** is the caption text, the script the voice reads, and the on-screen copy repeats its numbers. It is plain, direct, for a student the night before a
test, with both addresses said aloud. The JSON files are in section 4.3; the segments in order:

`two-addresses` (8 segments, 393 words):

| id | Words | Text |
|---|---|---|
| intro | 53 | This is one dot: the complex number minus one plus i root three. It is a single place in the plane, and it never moves. What changes is how we tell someone where it is. There are two ways to give its address, and the whole test comes down to choosing between them. |
| cart | 49 | The Cartesian address says where the dot sits. Start at zero. Slide one step left, then root three steps up. That is x equals minus one and y equals root three. Two numbers, and the dot is found. Everything Cartesian is blue: the drop lines, the axes, the grid. |
| polar | 47 | The polar address says how to make the dot. Take the number one, turn it 120 degrees, then stretch it to length 2. That is the angle theta, two pi over three, and the length r, 2. Everything polar is orange: the ray, the arc, the circles. |
| same | 46 | Now both at once. One dot, drawn one time. Cartesian says: left one, up root three. Polar says: turn 120 degrees, stretch to length 2. They agree because x is r cosine theta and y is r sine theta. Same dot, two ways of reaching it. |
| add | 51 | Adding is a slide. Add two minus i to the dot and the whole plane slides, with the dot riding along. In Cartesian that is easy: add the x parts, add the y parts. In polar there is no simple rule for the new length and angle. Slides belong to Cartesian. |
| mul | 49 | Multiplying is a move. Multiply the dot by one plus i, which has length root two and angle 45 degrees. The whole plane turns 45 degrees and stretches by root two. In polar that is easy: add the angles, 120 plus 45 is 165 degrees, and multiply the lengths. |
| rule | 44 | So every question starts with one choice: which address makes this easy? Sums, differences and distances are slides, so use Cartesian. Products, powers and roots are moves, so use polar. Do the work there, then translate back. Small whole numbers can go either way. |
| euler | 54 | The dictionary between the two addresses is Euler's formula. E to the i theta is the point on the unit circle at angle theta, and its Cartesian address is cosine theta, sine theta. Stretch it to length 2 at 120 degrees and you are back at minus one plus i root three. Same dot. |

`staircase-roots` (9 segments, 413 words):

| id | Words | Text |
|---|---|---|
| intro | 40 | Same dot, harder question. It is one place, with one Cartesian address. But its polar address is not unique: the length is 2, yet the angle can be many numbers. That one fact explains roots, branches, and half the test. |
| names | 41 | Turn 120 degrees from the real axis and you reach the dot. Turn 480 degrees, one full turn more, and you reach it again. Turn minus 240, one full turn back, and again. Three correct angles: three names for one move. |
| set | 38 | Little arg z is the whole set of names. Above the dot stands a staircase, one step for every full turn: minus 240, 120, 480, and on and on. The dot sits on the floor and never moves. |
| home | 42 | Capital Arg z is the one step we call home: above minus 180 degrees, up to and including 180. For our dot, 120 degrees. Capital Arg z is one number, little arg z is all of them, and the dot is neither. |
| jump | 45 | Watch the home step as the dot crosses the negative real axis. It jumps, from 180 degrees to minus 180. Over a whole lap the dot and the staircase move smoothly, but the home step jumps once. A name that keeps climbing cannot stay home. |
| power | 50 | Powers do not care which name you use. Take root three plus i: length 2, angle 30 degrees. Ten times 30 is 300. Use the name 390 and ten times is 3900, ten full turns more: the same dot. The tenth power has length 1024 and angle minus 60 degrees. |
| roots | 52 | Roots need every name. For the fifth roots of one, the names of its angle are 0, 360, 720 and up. Divide by 5: 0, 72, 144, 216, 288 degrees. Five dots, 72 degrees apart, and step five is step zero again. The fourth roots of minus 16 work the same way. |
| principal | 52 | The principal root uses the home name only. The square root of two i has length root two. The home angle is 90 degrees, so half of it is 45. That is root two at 45 degrees: one plus i. The other root, minus one minus i, uses the next step up. |
| branch | 53 | A branch is a continuous choice of step; the seam is where it must jump. The principal seam is the negative real axis. To be continuous there, slide the seam to the positive real axis, so angles run from 0 to 360. Then minus one has angle 180, and its cube root, 60. |

Capital `Arg z` and little `arg z` are both written exactly so; a speech model says both the same way, so the words around them ("Little arg z is the whole
set", "Capital Arg z is the one step we call home") carry the difference, as in `media/narration/site/staircase.json`. Pronunciation note for the audio run (not a
build concern): "arg" is the word a speech model may misread; the local agent should listen to `staircase-roots/set` and `staircase-roots/home` and, if one is wrong,
change the **text**, not the voice (a text change is picked up by the clip hash).

**On-screen copy.** Strings in the card are `MathTex` unless marked (T) for `Text`. `C` is `CART`, `P` is `POLAR`, `I` is `INK`, `M` is `MUTED`.

`two-addresses`:

| Beat | Card title (T, bold) | Card lines | On the plane |
|---|---|---|---|
| intro | `One dot` (I) | `z = -1 + i sqrt 3` (I); "Where is it?" (T, M); two outlined chips: "Cartesian address" (T, C), "polar address" (T, P) | the dot and `z`, axes `Re` `Im` (T, M), faint grid |
| cart | `Cartesian address` (C) | `(x, y) = (-1, sqrt 3)` (C); `z = x + iy = -1 + i sqrt 3` (C); "a slide: left 1, then up sqrt 3" (T, C); "blue = Cartesian: drop lines, axes, grid" (T, C) | dashed drop lines (C); `x = -1`, `y = sqrt 3` (C); arrows "left 1", "up sqrt 3" (T, C); axes and grid tinted C |
| polar | `polar address` (P) | `(r, theta) = (2, 2pi/3)` (P); "turn theta = 120°" (P); "stretch to r = 2" (P); "orange = polar: ray, arc, circles" (T, P) | ray and arc (P); `theta = 2pi/3 = 120°`, `r = 2` (P); circles r = 1, 2 and rays every 30° except the 120° one (P, faint); the unit arrow (I); the Cartesian drop lines as faint ghosts, their two labels gone |
| same | `Same dot` (I) | `(x, y) = (-1, sqrt 3)` (C); `(r, theta) = (2, 2pi/3)` (P); `-1 = 2 cos 120°` and `sqrt 3 = 2 sin 120°` (left side C, right side P); "one dot, two addresses, they agree" (T, OK) | both overlays at full strength on one dot |
| add | `Add: a slide` (C) | `(-1 + i sqrt 3) + (2 - i)`; `= (-1 + 2) + (sqrt 3 - 1) i`; `= 1 + (sqrt 3 - 1) i ≈ 1 + 0.73i` (all C); "in polar: r ≈ 1.24, theta ≈ 36.2°, no tidy rule" (T, P) | a lattice of dots (C), the ghost dot, an arrow z to z + (2 - i) labelled `+(2 - i)` (C), then `z + (2 - i)` (I) |
| mul | `Multiply: a move` (P) | `× (1 + i) = sqrt 2 e^{i 45°}`; `120° + 45° = 165°`; `2 · sqrt 2 = 2 sqrt 2` (all P); `z(1 + i) ≈ -2.73 + 0.73i` (C) | arcs `120°`, `+45°`, `165°` (P); a tile that turns 45° and grows by sqrt 2; the product dot labelled `z(1 + i)` (I); dashed ring of length 2 sqrt 2 |
| rule | header "Which address makes this easy?" (T, I, bold 44) | box titles "Cartesian: a slide" (T, C), "polar: a move" (T, P); `z1 + z2, z1 - z2` and `abs(z1 - z2) (distance)` (C); `z1 z2, z1/z2` and `z^n, nth root of z` (P); "do the work there, then translate back" (T, I); "small whole numbers: either way" (T, M); `(3 - 2i)(-1 + 4i) = 5 + 14i` (C); `sqrt 13 · sqrt 17 = sqrt 221 = abs(5 + 14i)` (P) | none (the plane is gone) |
| euler | `Euler's formula` (I) | `e^{i theta} = cos theta + i sin theta` (left P, right C); `theta = 120°: e^{i theta} = -1/2 + (sqrt 3 / 2) i`; `2 e^{i 120°} = -1 + i sqrt 3` (I); "unit circle: length 1", then "stretch to length 2" (T, P) | unit circle (P), the point (I), `cos theta` leg (C, solid) and `sin theta` leg (C, dashed), `theta` and its arc (P); once the point is stretched the legs are labelled `r cos theta` and `r sin theta` while it grows, then `2 cos theta` and `2 sin theta` at length 2 (the number `r` or `2` P, the rest C), so a leg is never named for a length it does not have |

`staircase-roots` (labels on the stage are `MathTex` in `P` unless marked):

| Beat | Card title (T, bold) | Card lines | On the stage |
|---|---|---|---|
| intro | `One dot` (I) | `Cartesian: (-1, sqrt 3)` (C); `polar: length 2, angle ?` (P); `120°, 480°, -240°, ...` (P); "roots, branches, half the test" (T, M) | the plane from above, the dot and `z`, the ray, a 120° arc and a spiral to 480°, `120°`, a `?` (WARN) |
| names | `Three names, one dot` (P) | `theta = 120°`; `theta = 480° = 120° + 360°`; `theta = -240° = 120° - 360°` (P); "the same dot every time" (T, I) | the ray; arc 0 to 120° (solid); arc 0 to 480° (a spiral); arc 0 to -240° (clockwise, dashed); each arc thickens as its row is said |
| set | `arg z: the whole set` (P) | `arg z = {120° + 360° k}`; `k = ..., -2, -1, 0, 1, 2, ...` (P); "one step for every full turn" (T, P); "the dot stays on the floor" (T, I) | the camera lowered: pole, bars at -600 to 840 over the dot, labels `-240°`, `120°`, `480°` |
| home | `Arg z: the home step` (P) | `Arg z in (-180°, 180°]`; `Arg z = 120°`; `Arg z` "is one number"; `arg z` "is all of them" (P and I); "z: the place they all point to" (T, I) | the bar at 120° thick with an `INK` ring; the bracket on the pole, `180° ]` and `-180° (`; the seam (SEAM) and its label `seam` |
| jump | `The home step jumps` (P) | "name that keeps climbing" with a live number; `Arg z (the home name)` with a live number (I); "a name that keeps climbing cannot stay home" (T, M) | the dot goes round; the home bar leaves the top of the bracket and enters the bottom; a red (`WARN`) ring at both ends of the bracket for 0.9 s at each jump |
| power | `Powers ignore the name` (P) | `z = sqrt 3 + i = 2 e^{i 30°}` (C and P); three rows each with a dial pointing at 300°: `30° · 10 = 300°`, `390° · 10 = 3900° = 300° + 3600°`, `-330° · 10 = -3300° = 300° - 3600°`; `z^10 = 1024 e^{-i 60°}` (P); `= 512 - 512 sqrt 3 i` (C) | bars at -330°, 30°, 390° with labels; a dashed floor ray at -60° and an arc `-60°`; "z^10: length 1024" |
| roots | `Roots need every name` (P) | `arg 1 = {0°, 360°, 720°, ...}`; `div 5: 0, 72, 144, 216, 288 (°)`; `step 5: 360° = 0° again`; `4th root of -16: 2 e^{i(45° + 90° k)}` (P); `= ±sqrt 2 ± sqrt 2 i` (C) | from above: the unit circle, five dots (I), rays, a pentagon, five `72°` labels, name labels `0°` to `288°`, a green (`OK`) arrow from 288° onto 0°; then four dots at 45°, 135°, 225°, 315° and `length 2` |
| principal | `The principal root` (P) | `w = 2i: abs w = 2, Arg w = 90°`; `sqrt 2 at 90°/2 = 45°`; `sqrt 2 e^{i 45°} = 1 + i`; `sqrt 2 e^{i 225°} = -1 - i` (I); "225 degrees is (90 + 360) / 2" (T, M) | `w = 2i` (C) at the top of the circle with an arc 90°; the principal root: `INK` dot with a `POLAR` ring, `1 + i` (C) over `sqrt 2 at 45°` (P); the other root ghosted with `-1 - i` (C, faint); a tracer from w to the root |
| branch | `Branch of the cube root` (P) | "name in the window" with a live number; "cube root: angle div 3" with a live number (I); `(-1)^{1/3} = e^{i 60°} = 1/2 + (sqrt 3 / 2) i`; "seam on the positive real axis: continuous at -1" (T, M) | the seam sliding; the window bracket sliding up the pole with live end labels; the dot crossing; the cube root's marker (a `POLAR` dot with an `INK` ring) at angle name / 3 |

No string in the card is longer than 5.6 screen units: `card_line` and `card_title` shrink a longer mobject to fit, so a font with wider glyphs (the student's Mac) cannot push text out of
the card.

---

## 3. Visual encoding

The videos use the dark palette only (one render, `videos/lib/palette.py` = the dark tokens of `css/theme.css`); in the site's light theme the video sits
in its dark frame inside a light panel (`i2-media-core` 3.2). Colours come from the module, never as a literal (A2 greps for `#rrggbb`).

### 3.1 Colour code (the teaching device of STORY section 4)

| Mark | Name | Value | On the frame background | On the card |
|---|---|---|---|---|
| Background | `BG` | `#0d121c` | | |
| Card, plane panel, boxes | `SURFACE` | `#151c2b` | | |
| The point z, every dot, "same" text, results | `INK` | `#e9edf5` | 15.97 : 1 | 14.52 : 1 |
| Axes, grid, kicker, secondary lines | `MUTED` | `#a6b0c3` | 8.59 : 1 | 7.80 : 1 |
| Everything Cartesian: x, y, drop lines, axes and grid in the `cart` and `add` beats, the slide, "Cartesian" | `CART` | `#62adf2` | 7.84 : 1 | 7.12 : 1 |
| Everything polar: r, theta, arg, names, the ray, the arc, circles, rays, bars, the helix, the window, "turn", "stretch", "move" | `POLAR` | `#ff9d5c` | 9.13 : 1 | 8.30 : 1 |
| The seam, dashed | `SEAM` | `#8e99b0` | 6.55 : 1 | 5.95 : 1 |
| A jump (a ring for 0.9 s), the "?" of `intro` | `WARN` | `#ff8178` | 7.73 : 1 | 7.03 : 1 |
| Agreement ("they agree"), "step five is step zero again" | `OK` | `#63d08a` | 9.75 : 1 | 8.86 : 1 |

Both addresses on one formula use two colours in one `MathTex` (`e^{i theta}` is `POLAR`, `cos theta + i sin theta` is `CART`; `-1 = 2 cos 120°` is `CART`, `INK` for the equals sign, `POLAR`; every `MathTex` is built with `color=INK` first, so no piece is manim's default white; `z = sqrt 3 + i = 2 e^{i 30°}`
is `CART` then `POLAR`). The arcs and the card agree: a Cartesian number is blue wherever it is printed, a polar one orange. `INPUT`, `OUTPUT` and the time ramp are not used: nothing here is a
stroke carried by a function. All contrast ratios are above 5.9 : 1.

### 3.2 Marks, per element

| Element | Style |
|---|---|
| The dot z | `Dot` radius 0.13 to 0.14, `INK`, drawn once; its label `z` is `MathTex` size 48 |
| Drop lines (`cart`) | `DashedLine`, `CART`, width 4, dash 0.12; the slide arrows width 9 |
| Ray and arc (`polar`) | `POLAR`, width 6; arc radius 0.9; labels `MathTex` 42 to 44 |
| Polar grid | circles r = 1, 2 width 1.6, opacity 0.35; rays every 30 degrees width 1.2, opacity 0.22 |
| Tracer arrow | `INK`, width 9, always on top (z 9), removed when it has landed on the orange ray |
| The cards and boxes | `SURFACE` fill, `MUTED` border at 0.4 opacity, corner radius 0.2; the `rule` boxes have a `CART` and a `POLAR` border of width 4 |
| Floor (`staircase-roots`) | polygon radius 1.55 L filled `MUTED` at 0.07; axes `MUTED` width 2 at 0.75; the circle of interest `POLAR` width 2.5 at 0.5 |
| Pole | `MUTED`, width 3, from -0.2 to 3.6 turns above the floor; invisible when looking straight down |
| Step bar and tip | bar `POLAR` width 3 at 0.5, tip radius 0.09 at 0.6; the **home** bar width 7 at 1.0, tip radius 0.17 with an `INK` ring of radius 0.29 |
| Handrail (helix) and tether | helix `POLAR` width 2.2 at 0.16 (fainter than the bars, so the pole and the labelled tips carry the picture); tether `POLAR` dashed width 2 at 0.5 |
| Window bracket | a 0.5-wide band on the pole, `POLAR` at 0.28 fill; the **top** edge solid (the name 180 is in), the **bottom** edge dashed (-180 is out): the picture of (-180, 180] |
| Seam | `SEAM` dashed, width 5, from the origin to 1.55 L, with the word `seam` (T, `SEAM`, 32) 0.55 L along it, on its left-hand normal by 0.36 (0.66 when the seam is vertical): below the negative real axis, right of the negative imaginary axis, above the positive real axis, away from the home bar |
| Jump flash | two `WARN` rings at the ends of the bracket, radius 0.3 growing to 1.0, opacity 1 to 0 over 0.9 s |
| Dials (`power`) | circle radius 0.3 at 0.6 and a radius of width 6 at the direction; three of them point at 300 degrees |

Type sizes (manim `font_size`, 1280 x 720): card titles 34 to 38 bold; card lines 38 to 48; in-plane labels 42 to 48; legends 28 to 32; the kicker 30. The faces are manim's defaults (`Text` uses
the system's default sans, `MathTex` Computer Modern); no font is named, so nothing can be missing. `card_line` shrinks any line wider than 5.6 units, which is what keeps another machine's
font metrics from changing the picture.

### 3.3 Both themes

There is no theme switch inside a video. In the light theme the player's panel chrome follows the theme and the frame stays dark (a design choice of `i2-media-core`); every contrast above is
measured against the dark frame and card.

---

## 4. Module API

A video goal has no runtime module: its interface is two Python files and two JSON files that `tools/videos/render.mjs` and `NarratedScene` consume.

### 4.1 Files

| File | Contract |
|---|---|
| `videos/scenes/two-addresses.py` | `class Main(NarratedScene)` with `narration_id = "two-addresses"`; imports `from lib.narrated import NarratedScene` and `from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, OK`; one `with self.beat("<id>") as t:` per segment in the JSON's order |
| `videos/scenes/staircase-roots.py` | the same with `narration_id = "staircase-roots"` and `from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, SEAM, WARN, OK` |
| `media/narration/videos/two-addresses.json`, `.../staircase-roots.json` | `{ id, title, summary, station, music: { prompt, seconds }, segments: [ { id, text } ] }` (section 4.3) |
| `media/video/<id>.mp4`, `media/video/<id>.vtt`, `media/manifest.js` | written by `node tools/videos/render.mjs`; the `.vtt` by `NarratedScene.tear_down` (one cue per beat: start and end are the scene clock at the start and end of the beat, the text is the segment's), the manifest by `writeManifest` (`id`, `title`, `summary`, `station`, `src`, `captions`, `seconds`, `narrated`, `music`) |

### 4.2 The scene classes

Module-level names (the same in both files unless noted):

```python
S3, S2, TAU                                   # sqrt 3, sqrt 2, 2 pi
def tex(s, color=INK, size=44, **kw) -> MathTex
def words(s, color=INK, size=32, weight=NORMAL) -> Text
class Shots:                                  # the one scheduler (D2)
    def __init__(self, scene, t)              # t: the beat length in seconds, as NarratedScene.beat yields it
    def elapsed(self) -> float                # scene clock since the beat began
    def at(self, frac)                        # idle until `frac` of the beat has gone (one wait, capped at 0.5 t)
    def go(self, frac, length, *anims, **kw)  # start at frac, last `length` of the beat; asserts frac + length <= 0.97
    def pop(self, *anims)                     # the opening picture: min(0.3, 0.02 t) seconds
# two-addresses.py only:  P(x, y=0, u=U), polar_pt(r, deg, u=U)        plane point to screen point
# staircase-roots.py only: wrap_to(deg, lo), hgt(deg)                  the window rule (D9) and the height of a step (D6)
```

`class Main(NarratedScene)`:

| Member | Meaning |
|---|---|
| `narration_id` | the file name without `.py`; `NarratedScene.setup` loads `media/narration/videos/<narration_id>.json` |
| `construct(self)` | sets `self.camera.background_color = BG`, builds the stage, then one `with self.beat("<id>") as t:` per segment, each calling a method named after the beat (`intro`, `cart`, `polar`, `same`, `add_beat`, `mul`, `rule`, `euler`; `intro`, `names`, `set_beat`, `home`, `jump`, `power`, `roots`, `principal`, `branch`) |
| the beat methods | `def <beat>(self, t)`: `b = Shots(self, t)`, one `b.pop(...)`, then `b.go(...)` shots; they leave the mobjects the next beat must fade in `self.<beat>_stuff` |
| `staircase-roots` state | `phi` (camera elevation, 90 looking down, 38 from the side), `ang` (the dot's angle in degrees, **not wrapped**), `sig` (the seam: the window of names is `(sig, sig + 360]`), `lw` (the length drawn at the circle of interest), `kspan` (which steps are drawn), `home_on`, `last_jump`, `vis` (opacity trackers: floor, seam, stairs, window, dot, arcs), `emph` (three pulse trackers) |

Events and lifecycle: a scene is a function of nothing; it reads no input. Lifecycle is `setup` (reads the JSON) then `construct` then `tear_down` (writes the `.vtt`). Cleanup inside
`construct`: every updater added by a beat (`DecimalNumber` readouts, the jump watcher, the window labels) is cleared at the end of that beat; no state outlives the render. The scenes write no
file themselves (a unit test greps for `open(`, `write_text`, `subprocess`, `requests`, `urllib`, `socket`).

### 4.3 The narration files (final; copy verbatim)

`media/narration/videos/two-addresses.json`:

```json
{
  "id": "two-addresses",
  "title": "One point, two addresses",
  "summary": "One dot, minus one plus i root three, reached two ways: a slide in Cartesian and a turn and stretch in polar, and why adding is easy in one address and multiplying in the other.",
  "station": "addresses",
  "music": {
    "prompt": "Calm, spacious ambient piano with a slow pulse, warm and focused, no vocals, quiet enough to sit under a spoken math explainer.",
    "seconds": 30
  },
  "segments": [
    {
      "id": "intro",
      "text": "This is one dot: the complex number minus one plus i root three. It is a single place in the plane, and it never moves. What changes is how we tell someone where it is. There are two ways to give its address, and the whole test comes down to choosing between them."
    },
    {
      "id": "cart",
      "text": "The Cartesian address says where the dot sits. Start at zero. Slide one step left, then root three steps up. That is x equals minus one and y equals root three. Two numbers, and the dot is found. Everything Cartesian is blue: the drop lines, the axes, the grid."
    },
    {
      "id": "polar",
      "text": "The polar address says how to make the dot. Take the number one, turn it 120 degrees, then stretch it to length 2. That is the angle theta, two pi over three, and the length r, 2. Everything polar is orange: the ray, the arc, the circles."
    },
    {
      "id": "same",
      "text": "Now both at once. One dot, drawn one time. Cartesian says: left one, up root three. Polar says: turn 120 degrees, stretch to length 2. They agree because x is r cosine theta and y is r sine theta. Same dot, two ways of reaching it."
    },
    {
      "id": "add",
      "text": "Adding is a slide. Add two minus i to the dot and the whole plane slides, with the dot riding along. In Cartesian that is easy: add the x parts, add the y parts. In polar there is no simple rule for the new length and angle. Slides belong to Cartesian."
    },
    {
      "id": "mul",
      "text": "Multiplying is a move. Multiply the dot by one plus i, which has length root two and angle 45 degrees. The whole plane turns 45 degrees and stretches by root two. In polar that is easy: add the angles, 120 plus 45 is 165 degrees, and multiply the lengths."
    },
    {
      "id": "rule",
      "text": "So every question starts with one choice: which address makes this easy? Sums, differences and distances are slides, so use Cartesian. Products, powers and roots are moves, so use polar. Do the work there, then translate back. Small whole numbers can go either way."
    },
    {
      "id": "euler",
      "text": "The dictionary between the two addresses is Euler's formula. E to the i theta is the point on the unit circle at angle theta, and its Cartesian address is cosine theta, sine theta. Stretch it to length 2 at 120 degrees and you are back at minus one plus i root three. Same dot."
    }
  ]
}
```

`media/narration/videos/staircase-roots.json`:

```json
{
  "id": "staircase-roots",
  "title": "The staircase: many names for one turn",
  "summary": "One dot has many polar names for its angle. Little arg z is the whole staircase and capital Arg z is the home step; powers ignore the name, roots need all of them, and a branch is a continuous choice.",
  "station": "staircase",
  "music": {
    "prompt": "Gentle, curious ambient strings with a slowly rising line and a soft pulse, no vocals, quiet enough to sit under a spoken math explainer.",
    "seconds": 30
  },
  "segments": [
    {
      "id": "intro",
      "text": "Same dot, harder question. It is one place, with one Cartesian address. But its polar address is not unique: the length is 2, yet the angle can be many numbers. That one fact explains roots, branches, and half the test."
    },
    {
      "id": "names",
      "text": "Turn 120 degrees from the real axis and you reach the dot. Turn 480 degrees, one full turn more, and you reach it again. Turn minus 240, one full turn back, and again. Three correct angles: three names for one move."
    },
    {
      "id": "set",
      "text": "Little arg z is the whole set of names. Above the dot stands a staircase, one step for every full turn: minus 240, 120, 480, and on and on. The dot sits on the floor and never moves."
    },
    {
      "id": "home",
      "text": "Capital Arg z is the one step we call home: above minus 180 degrees, up to and including 180. For our dot, 120 degrees. Capital Arg z is one number, little arg z is all of them, and the dot is neither."
    },
    {
      "id": "jump",
      "text": "Watch the home step as the dot crosses the negative real axis. It jumps, from 180 degrees to minus 180. Over a whole lap the dot and the staircase move smoothly, but the home step jumps once. A name that keeps climbing cannot stay home."
    },
    {
      "id": "power",
      "text": "Powers do not care which name you use. Take root three plus i: length 2, angle 30 degrees. Ten times 30 is 300. Use the name 390 and ten times is 3900, ten full turns more: the same dot. The tenth power has length 1024 and angle minus 60 degrees."
    },
    {
      "id": "roots",
      "text": "Roots need every name. For the fifth roots of one, the names of its angle are 0, 360, 720 and up. Divide by 5: 0, 72, 144, 216, 288 degrees. Five dots, 72 degrees apart, and step five is step zero again. The fourth roots of minus 16 work the same way."
    },
    {
      "id": "principal",
      "text": "The principal root uses the home name only. The square root of two i has length root two. The home angle is 90 degrees, so half of it is 45. That is root two at 45 degrees: one plus i. The other root, minus one minus i, uses the next step up."
    },
    {
      "id": "branch",
      "text": "A branch is a continuous choice of step; the seam is where it must jump. The principal seam is the negative real axis. To be continuous there, slide the seam to the positive real axis, so angles run from 0 to 360. Then minus one has angle 180, and its cube root, 60."
    }
  ]
}
```

Both are UTF-8, two-space indent, a trailing newline, ASCII only. `station` is the station the video belongs to (`addresses`, `staircase`); `music.seconds` is 30 (A2: 20 to 40) and
`music.prompt` is what `tools/media/generate-audio.mjs` sends to the music model.

### 4.4 Test hooks

None: no `window.__mv` entry, no DOM. The checks read files (unit test, Appendix C) and the manifest and panel through the browser (interaction script, Appendix D).

---

## 5. Algorithms

There is no input, no hit test and no loop of our own: manim runs the frame loop. What follows is the order of operations the builder implements; Appendices A and B are
the same thing as validated code and are the reference where this prose is thinner.

### 5.1 The beat clock (`Shots`, both files)

```
Shots(scene, t):                      t = the beat length in seconds that NarratedScene.beat yielded
  1. clock0 = scene.renderer.time                      (the scene clock when the beat began)
at(frac):
  1. gap = frac * t - (scene.renderer.time - clock0)   (how long until `frac` of the beat has gone)
  2. if gap > 0.1: scene.wait(min(gap, 0.5 * t))       (0.1 s: a wait under one frame at 15 fps makes manim warn and round up; 0.5 t: A4)
go(frac, length, *anims, **kw):
  1. assert length > 0 and frac + length <= 0.97       (a shot never runs into the last 3% of its beat)
  2. at(frac)
  3. scene.play(*anims, run_time = length * t, **kw)
pop(*anims):
  1. scene.play(*anims, run_time = min(0.3, 0.02 * t))   (the opening picture, on screen by cue start + 0.3 s)
```

Because `at` measures against the beat's own clock, a shot that a frame rounding made late cannot delay the next one; because `go` asserts the end, the sum of the shots plus the
context manager's pad is exactly `t`, and the `.vtt` cue times stay equal to the sum of the beat lengths (the prototype's cue 9 of `staircase-roots` ends at 168.2 s against an estimate of 168.4 s).

### 5.2 A beat

```
construct():
  1. self.camera.background_color = BG
  2. build the stage once (V1: panel, frame, grid, axes, card, dot; V2: panel, frame, card, the always-redrawn stage)
  3. for each segment id in the JSON's order:
       with self.beat(id) as t:         # NarratedScene reads the segment, picks t, mixes the clip if one exists, pads, records the cue
         self.<id>(t)
<id>(t):
  1. b = Shots(self, t)
  2. build every mobject the beat needs (they are plain objects; nothing is on screen yet)
  3. b.pop(FadeOut(previous beat's card), FadeIn(this beat's card and finished picture), ...)        # D1
  4. b.go(f1, l1, ...); b.go(f2, l2, ...); ...      # increasing f, each f + l <= 0.97, aligned to the sentences of the voice (5.5, 5.7)
  5. keep the mobjects the next beat must remove in self.<id>_stuff; clear any updater added here
```

### 5.3 Timing arithmetic (the clock the narration sets)

```
words(seg)   = len(text.split())
t(seg)       = max(1.5, words / 2.5) + 0.35          (videos/lib/narrated.py: MIN_BEAT_SECONDS, WORDS_PER_SECOND, PAD_SECONDS)
video length = sum of t(seg) over the segments         two-addresses 160.0 s (393 words), staircase-roots 168.4 s (413 words)
a sentence that holds words c0 .. c1 of W words occupies the fractions  [c0 / W, c1 / W] * (t - 0.35) / t   of the beat
with audio:  t(seg) = clip length + 0.35, so every fraction above keeps its meaning (D2)
```

The windows of the sentences, from that formula, are the "Voice" column of the shot tables 5.5 and 5.7.

### 5.4 `two-addresses`: the plane

```
P(x, y, u) = O + u * (x, y, 0)            O = (-3.3, -0.4), u = U = 1.0 screen units per plane unit (UE = 1.55 in `euler`)
Z = (-1, sqrt 3)                          screen (-4.3, 1.332): r = 2, Arg = 120 degrees
frame: Cutout(Rectangle 16 x 9, Rectangle 6.9 x 6.0 centred (-3.3, -0.2)), BG, z-index 10     hides lattice, rings and tile past the panel
z-order: plane marks (grid, drop lines, ray, arcs, lattice, tile) < 10;  the dot 8;  the tracer arrow 9;  card and boxes 20;  their text 21 and 22
```

1. **cart.** Pop: `Create` the two dashed lines `Z -> (-1, 0)` and `Z -> (0, sqrt 3)`; `FadeIn` the labels `x=-1` below `(-1, 0)` and `y=\sqrt3` to the right of `(0, sqrt 3)`; recolour axes and grid
   to `CART` (`animate.set_stroke`). Shots: arrow `(0,0) -> (-1,0)` with "left 1"; arrow `(-1,0) -> Z` with "up sqrt 3" (the second leg lies on the dashed line).
2. **polar.** Pop: the two Cartesian labels fade out (they would lie under the orange labels) and the drop lines drop to opacity 0.2; polar grid (without its 120 degree ray, which would run through the `z` label); ray `O -> Z` and arc radius 0.9 from 0 to 120 degrees (`Arc(start_angle=0, angle=2pi/3, arc_center=O)`); labels. Tracer:
   `ang`, `ln` trackers; `vec = always_redraw(Arrow(O, O + U ln (cos ang, sin ang)))`; shot 1: `ang: 0 -> 120`; shot 2: `ln: 1 -> 2`; then it fades, leaving the orange ray under it.
3. **same.** Both overlays to full strength (the two Cartesian labels fade back in); the `Indicate` of the dot, the `CART` group, the `POLAR` group, then the two rows `-1 = 2 cos 120°` and `sqrt 3 = 2 sin 120°`.
4. **add.** `w = (2, -1)`; lattice `Dot(P(x, y))` for x = -5..5, y = -4..4 (`CART`, radius 0.05, opacity 0.6); `carried = VGroup(lattice, dot)`;
   shot: `carried.animate.shift(U * (2, -1))`, 0.30 of the beat, eased (`smooth`); the ghost dot and the arrow `Z -> Z + w` stay behind. New dot at `(1, sqrt 3 - 1)` = screen (-2.3, 0.332).
5. **mul.** `rr = 2 sqrt 2`; `res_pt = polar_pt(rr, 165)` = screen (-6.032, 0.332). Static: arcs `120°` (radius 0.62), `+45°` (0.95, from 120 to 165), `165°` (1.3, thin), dashed ring radius `rr`, the target tile
   (side 0.64 sqrt 2, turned 45 degrees, at `res_pt`; its corner reaches 0.64 to the left of the product, inside the panel, whose edge is 0.72 away), the product label `z(1 + i)` inside the ring, the product dot. `carried = VGroup(polar lattice, tile, ghost dot)`; shot 1: `Rotate(carried, pi/4, about_point=O)`; shot 2:
   `carried.animate.scale(sqrt 2, about_point=O)`; the tile lands on its target. (A circle does not show a rotation: the tile and the 30-degree rays do.)
6. **rule.** The plane group is faded in the pop; the header, two boxes and their titles appear; then the lists, the double arrow (`CurvedDoubleArrow` between the lower edges) and the example.
7. **euler.** A fresh `stage(UE)` (grid and axes at the zoom), the unit circle radius UE, `ang` (40 -> 120) and `rad` (1 -> 2) trackers; point `P(rad cos ang, rad sin ang, UE)`, foot `P(rad cos ang, 0, UE)`;
   legs `O -> foot` (`CART`, solid, width 8) and `foot -> point` (`CART`, dashed); the angle arc radius 0.55; labels follow by updaters (the horizontal leg's label 0.4 under the middle of the leg; the vertical leg's label on its outer side, 0.2 plus half its own width away).
   Shot 1 sweeps `ang`. **The labels name the legs as they are:** `cos theta` and `sin theta` on the unit circle; `r cos theta` and `r sin theta` (the `r` in `POLAR`) from just before the stretch; `2 cos theta` and `2 sin theta`
   (the 2 in `POLAR`) once `rad` is 2, so that the final legs read `-1 = 2 cos 120°` and `sqrt 3 = 2 sin 120°`, the two rows of the `same` beat. Each swap is a short cross-fade (three pairs of labels, each pair following the legs by updaters).
   Shot 2 stretches `rad` to 2 with the dashed circle of radius 2 UE.

### 5.5 `two-addresses`: the shots (fractions of the beat; `Voice` is the sentence window from 5.3)

| Beat (t) | Voice | Shots (start-end) |
|---|---|---|
| intro (21.55 s) | 0-.07 "This is one dot:" .07-.24 "the complex number ..." .24-.46 "single place ... never moves" .46-.65 "What changes ..." .65-.98 "two ways ... choosing" | pop: panel, grid, axes, dot, card, title, `z = ...`; .25-.45 flash on the dot; .48-.62 "Where is it?"; .66-.78 Cartesian chip; .78-.90 polar chip |
| cart (19.95 s) | 0-.16 "The Cartesian address ..." .16-.22 "Start at zero." .22-.40 "Slide one step left ..." .40-.62 "That is x equals ..." .62-.76 "Two numbers ..." .76-.98 "Everything Cartesian is blue ..." | pop: drop lines, `x = -1`, `y = sqrt 3`, title, `(x, y)`; .16-.28 left arrow; .29-.43 up arrow and labels; .45-.65 `z = x + iy`; .62-.76 "a slide ..."; .78-.90 legend |
| polar (19.15 s) | 0-.19 "The polar address ..." .19-.48 "Take the number one, turn it 120 degrees, ..." .48-.77 "That is the angle theta ..." .77-.98 "Everything polar is orange ..." | pop: ray, arc, labels, grid, unit arrow, title, `(r, theta)`; .20-.43 turn; .45-.62 stretch; .64-.69 arrow fades; .78-.90 legend |
| same (18.75 s) | 0-.09 "Now both at once." .09-.19 "One dot ..." .19-.38 "Cartesian says ... Polar says:" .38-.53 "turn 120 degrees ..." .53-.83 "They agree because ..." .83-.98 "Same dot ..." | pop: both overlays at full strength, rows; .09-.20 dot; .21-.34 `CART` marks; .36-.53 `POLAR` marks; .55-.67 `-1 = 2 cos 120°`; .67-.79 `sqrt 3 = 2 sin 120°`; .82-.92 "they agree" |
| add (20.75 s) | 0-.08 "Adding is a slide." .08-.40 "Add two minus i ..." .40-.66 "In Cartesian that is easy ..." .66-.91 "In polar there is no simple rule ..." .91-.98 "Slides belong ..." | pop: lattice, ghost, arrow `+(2 - i)`, title, first line; .10-.40 the plane slides; .40-.44 `z + (2 - i)`; .43-.55 and .57-.67 the two lines; .72-.84 the polar hint |
| mul (19.95 s) | 0-.08 "Multiplying is a move." .08-.40 "Multiply the dot by one plus i, ..." .40-.62 "The whole plane turns 45 degrees ..." .62-.72 "In polar that is easy:" .72-.98 "add the angles ..." | pop: arcs, ring, tile, target, product dot, title, first line; .10-.32 turn 45 degrees; .34-.54 stretch by root two; .58-.70 the Cartesian result; .74-.84 lattice fades |
| rule (17.95 s) | 0-.27 "So every question starts with one choice: which address ...?" .27-.47 "Sums ... use Cartesian." .47-.67 "Products ... use polar." .67-.82 "Do the work there, then translate back." .82-.98 "Small whole numbers ..." | pop: header, boxes, titles; .27-.45 Cartesian list; .48-.66 polar list; .68-.82 double arrow and "do the work there ..."; .82-.94 the 1.1.1 example |
| euler (21.95 s) | 0-.16 "The dictionary ... Euler's formula." .16-.60 "E to the i theta is the point ..." .60-.95 "Stretch it to length 2 at 120 degrees ..." .95-.98 "Same dot." | pop: unit circle, point at 40 degrees, legs, arc, title, formula; .10-.50 sweep to 120 degrees; .52-.56 `theta = 120°: ...`; .57-.60 the leg labels become `r cos theta`, `r sin theta`; .60-.78 stretch to length 2; .78-.80 they become `2 cos theta`, `2 sin theta`; .80-.88 `2 e^{i 120°} = -1 + i sqrt 3`; .89-.96 flash |

### 5.6 `staircase-roots`: the stage

```
trackers:  phi (camera elevation, degrees), ang (the dot's angle, degrees, never wrapped), sig (the seam, degrees), vis[floor|seam|stairs|window|dot|arcs] (opacity 0..1), emph[0..2]
plain:     lw (the length drawn at the circle of interest), kspan = (kmin, kmax), home_on, last_jump (scene time of the last jump)
constants: RS = 2.3, HT = 1.35, X0 = -3.4, H0 = 1.0, POLE = (-0.2, 3.6), PHI_TOP = 90, PHI_TILT = 38, CY_TOP = -0.2, CY_TILT = -1.15
cy(phi)      = CY_TOP + (CY_TILT - CY_TOP) * (90 - phi) / (90 - 38)
k            = RS / lw
screen(x, y, h) = ( X0 + k x ,  cy(phi) + k y sin(phi) + h * HT * cos(phi) )          x, y in the units of lw; h in turns above the floor
floor(r, a, h)  = screen(r cos a, r sin a, h)
hgt(theta)      = theta / 360 + H0                                                     the height of the step named theta
wrap_to(d, lo)  = lo + ((d - lo) mod 360), with 0 replaced by 360                      the name of d that lies in (lo, lo + 360]
```

1. **Every part is an `always_redraw` that reads the trackers and multiplies its opacity by its `vis` entry** (D4). Parts: floor disk (radius 1.55 lw, `MUTED` at 0.07), axes, the circle of radius `lw`, the seam
   (dashed line to 1.55 lw at angle `sig`, and a `seam` label updater at 0.55 lw along the line and 0.36 to 0.66 to its left-hand side), the helix `floor(lw, p, hgt(p))` for `p` from `ang + 360 (kmin - 0.4)` to `ang + 360 (kmax + 0.4)` in steps of 4 degrees,
   the tether (a dashed vertical line through the tips), the pole (a line from `screen(0, 0, -0.2)` to `screen(0, 0, 3.6)`, invisible when `phi >= 80`), the step bars, the window bracket and its flash, the dot and its label.
2. **Step bars.** For `k` from `kmin` to `kmax`: `theta = ang + 360 k`; `h = hgt(theta)`; the bar is the line from `screen(0, 0, h)` (on the pole) to `floor(lw, theta, h)` (over the dot); it is the **home** bar
   when `home_on` and `sig < theta <= sig + 360`, drawn thick with a big tip and an `INK` ring. All bars of one dot have the same direction, so they stack, and the tips stand over the dot's floor point
   `floor(lw, ang, 0)`.
3. **Window bracket.** From `screen(0, 0, hgt(sig))` to `screen(0, 0, hgt(sig) + 1)`: a 0.5-wide band; solid top edge (`]`), dashed bottom edge (`(`). Only while `phi < 80`.
4. **Jump detection.** A mobject with an updater compares `wrap_to(ang, sig)` with the previous frame's value; a change of more than 180 degrees sets `last_jump` to the scene time; the flash draws two `WARN` rings, radius
   `0.3 + 0.7 min(age, 0.9)` and opacity `max(0, 1 - age / 0.9)`, at the two ends of the bracket. (When only `sig` moves the value does not jump, because `ang` stays inside the sliding window.)
5. **Live numbers.** `DecimalNumber(..., num_decimal_places=0, unit="^\circ")` with an updater `m.set_value(round(v())).set_z_index(21)` (D8): `jump` shows `round(ang)` and `round(wrap_to(ang, -180))`; `branch`
   shows `round(name)` and `round(name / 3)` with `name = wrap_to(ang, sig)`, and the two window-end labels `round(sig + 360)` and `round(sig)`, each updater also re-placing its label at 1.9 to the right of the pole at the
   bracket's top or bottom height.
6. **Camera.** `phi` is animated only in three pre-rolls, each in the tail of the beat before the one that needs the new view, so that beat opens on its picture (D1): `names` 0.88-0.97 (90 to 38), `power` 0.90-0.97 (38 to 90),
   `principal` 0.89-0.97 (90 to 38). Each takes 1.4 to 1.6 s. A tilt also moves the floor centre (`cy`), so the view pans while it lowers.
7. **Cuts (state set at a beat boundary, never seen as a jump).** `power` sets `ang = 30`, `kspan = (-2, 2)`, `home_on = False`, window and seam hidden. `roots` sets `lw = 1` (the unit circle at the usual size) and sets it to 2
   for the second half, when the four roots of -16 appear; the static dots built earlier keep their screen positions because they are plain mobjects, not redrawn. `principal` sets `lw = 2` and, in its tail, `lw = 1`, `kspan = (-3, 3)`,
   `home_on = True`, `ang = 165`, `sig = -180` before the camera lowers.

The static pictures of `roots` and `principal` are ordinary mobjects built at `phi = 90`; they are valid because the camera is not moving while they are on screen.

### 5.7 `staircase-roots`: the shots

| Beat (t) | Voice | Shots |
|---|---|---|
| intro (16.35 s) | 0-.10 "Same dot, harder question." .10-.29 "It is one place ..." .29-.46 "But its polar address is not unique:" .46-.73 "the length is 2, yet the angle ..." .73-.98 "That one fact explains ..." | pop: floor, dot, title, `Cartesian: (-1, sqrt 3)`; .12-.22 ray, 120 degree arc, spiral to 480, `120°`; .30-.42 `polar: length 2, angle ?`; .50-.68 `?` and `120°, 480°, -240°, ...`; .78-.90 "roots, branches, half the test" |
| names (16.75 s) | 0-.29 "Turn 120 degrees ..." .29-.57 "Turn 480 degrees ..." .57-.79 "Turn minus 240 ..." .79-.98 "Three correct angles ..." | pop: three arcs, three rows; each arc thickens by 5 and its row `Indicate`s: .08-.18, .30-.40, .55-.65 (and back 0.12 later); .78-.88 "the same dot every time" and a flash; .88-.97 the camera lowers; the three rows and "the same dot every time" stay up (the voice is still summing them up: "Three correct angles: three names for one move") and leave with the next beat's pop |
| set (15.55 s) | 0-.23 "Little arg z is the whole set of names." .23-.53 "Above the dot stands a staircase ..." .53-.75 "minus 240, 120, 480, and on and on." .75-.98 "The dot sits on the floor ..." | pop: pole, bars, tips over the dot, labels `-240°`, `120°`, `480°`, title, `arg z = ...`; .15-.35 `k = ...` and the three labels flash in turn; .55-.67 "one step for every full turn"; .70-.82 "the dot stays on the floor", flash |
| home (17.15 s) | 0-.23 "Capital Arg z is the one step we call home:" .23-.44 "above minus 180 ..." .44-.56 "For our dot, 120 degrees." .56-.98 "Capital Arg z is one number ..." | pop: the other labels fade, the 120 bar becomes the home bar, the bracket, `180° ]`, `-180° (`, the seam, title, `Arg z in (-180°, 180°]`; .30-.42 `Arg z = 120°`; .52-.62 "is one number"; .64-.74 "is all of them"; .78-.90 "z: the place they all point to", flash |
| jump (18.35 s) | 0-.26 "Watch the home step as the dot crosses ..." .26-.44 "It jumps, from 180 degrees to minus 180." .44-.81 "Over a whole lap ... jumps once." .81-.98 "A name that keeps climbing cannot stay home." | pop: title, two live numbers; **.00-.10 `ang` 120 to 200** (crosses 180 degrees at about cue + 1.7 s); .15-.25 back to 165; .27-.37 to 200 again; **.40-.80 `ang` 200 to 560** (one lap, one jump at 540); .82-.87 the note |
| power (20.35 s) | 0-.16 "Powers do not care which name you use." .16-.35 "Take root three plus i: length 2, angle 30 degrees." .35-.45 "Ten times 30 is 300." .45-.77 "Use the name 390 ... the same dot." .77-.98 "The tenth power ..." | pop (cut): bars at -330, 30, 390 with labels, title, `z = sqrt 3 + i = 2 e^{i 30°}`; .14-.26 row 1 and its dial, flash; .40-.52 row 2; .54-.66 row 3; .70-.82 the floor ray at -60 degrees, `-60°`, "z^10: length 1024", `z^10 = ...`; .84-.90 `= 512 - 512 sqrt 3 i`; .90-.97 the camera rises while the -60 degree ray, its arc and their two labels stay (the labels follow the camera by updaters; at the end of the beat all four are frozen and `roots` fades them with the card, because `roots` changes `lw` and a live ray would jump) |
| roots (21.15 s) | 0-.08 "Roots need every name." .08-.40 "For the fifth roots of one ..." .40-.57 "Divide by 5: ..." .57-.79 "Five dots, 72 degrees apart ..." .79-.98 "The fourth roots of minus 16 ..." | pop: unit circle, five dots, rays, pentagon, arcs, five `72°`, title, `arg 1 = ...`; .07-.27 the five dots flash in turn; .34-.50 `div 5: ...` and the name labels one by one; .54-.70 `step 5: ...` and the green arrow; .74-.82 the five-dot picture fades; .82-.94 four dots at 45, 135, 225, 315 degrees, `length 2`, two lines |
| principal (21.15 s) | 0-.15 "The principal root uses the home name only." .15-.34 "The square root of two i has length root two." .34-.57 "The home angle is 90 degrees, so half of it is 45." .57-.76 "That is root two at 45 degrees: one plus i." .76-.98 "The other root ..." | pop: `w = 2i`, ray, 90 degree arc, dashed circle, principal root (ring), ghost root, 45 degree arc, title, `w = 2i: ...`; .20-.48 tracer from `w` to the root; .50-.60 `sqrt 2 at 90°/2 = 45°`, flash; .60-.70 `sqrt 2 e^{i 45°} = 1 + i`; .74-.83 the dashed 225 degree arc and `... = -1 - i`; .85-.89 "225 degrees is (90 + 360) / 2"; .89-.97 map fades, camera lowers |
| branch (21.55 s) | 0-.28 "A branch is a continuous choice of step; the seam is where it must jump." .28-.43 "The principal seam is the negative real axis." .43-.78 "To be continuous there, slide the seam ..." .78-.98 "Then minus one has angle 180, ..." | pop: title, two live numbers, window labels, root marker; **.00-.12 `sig` -180 to -90** (the seam moves at once); .13-.23 back to -180; .25-.35 `ang` 165 to 195 (the name jumps; red rings); .36-.43 back to 165; **.43-.64 `sig` -180 to 0** (the window climbs the pole); .65-.74 `ang` 165 to 195 (no jump); .75-.80 to 180 (parked on -1); .80-.90 `(-1)^{1/3} = ...` and "seam on the positive real axis: continuous at -1" |

### 5.8 The still contract (what each beat shows at cue start + 0.5 s) and how to read it

The pop of a beat is its still; section 7.4 lists, beat by beat, what the review must see and gives two numeric aids (the corner pixel, and the share of pixels near `CART` and `POLAR`).
The two A3 pairs are built into the schedule: `jump` (the dot at 128.7 degrees at cue + 0.5 s and at 200 degrees at cue + 2.5 s: the home bar is in the upper half of the bracket in the first still and in the lower half in the second, and the live numbers read
`129°` and `129°`, then `200°` and `-160°`) and `branch` (the seam at -179.3 degrees at cue + 0.5 s and at -92.0 degrees at cue + 2.5 s: the dashed ray has moved from the left of the floor to straight down, and the window's end labels read `181°` and `-179°`, then `268°` and `-92°`). Both readings follow from the schedule: the pop takes 0.3 s, so a shot that starts at 0.00 of the beat has run 0.2 s at cue + 0.5 s.

### 5.9 Resolution management and render flags

Manim's frame is fixed at 14.222 x 8 screen units; **every size in the scenes is in screen units**, so `-ql` (854 x 480, 15 fps) and `-qm` (1280 x 720, 30 fps) draw the same picture. The renderer picks the folder
by quality (`480p15`, `720p30`) and copies the file to `media/video/<id>.mp4`; the `.vtt` is written by the scene and is the same for both. A shot's length is quantised to the frame: at 15 fps that is 0.067 s, which is why
`at` skips a gap under 0.1 s. The panel in the page shows the 1280 x 720 file at 918 x 516 (desktop) or 324 x 182 (phone).

---

## 6. Mathematics

Every number below was computed twice, by hand and with `js/core/complex.js`, and agrees to better than 1e-9 (the unit test U7 asserts them). Angles in the narration and on screen are degrees; `js/core/complex.js`
works in radians (`120 degrees = 2pi/3`, `45 = pi/4`, `72 = 2pi/5`). Arg is in (-180, 180]; the negative real axis has Arg +180.

### 6.1 Formulas used

| Name | Formula |
|---|---|
| Cartesian to polar | `r = sqrt(x^2 + y^2)`; `theta = atan2(y, x)` (the quadrant decides; `Arg` is the value in (-pi, pi]) |
| Polar to Cartesian | `x = r cos theta`, `y = r sin theta` |
| Euler | `e^{i theta} = cos theta + i sin theta`; `r e^{i theta} = r cos theta + i r sin theta` |
| Names | `arg z = { Arg z + 360 k : k in Z }` (degrees); every name gives the same point |
| Sum | `(x1 + x2, y1 + y2)`; a slide by the second number |
| Product (Def 1.2.4) | `(x1 x2 - y1 y2) + (x1 y2 + x2 y1) i`; in polar `r1 r2 e^{i (theta1 + theta2)}` |
| Quotient (Def 1.2.6) | `((x1 x2 + y1 y2) + (-x1 y2 + x2 y1) i) / (x2^2 + y2^2)`; in polar `(r1 / r2) e^{i (theta1 - theta2)}` |
| Power (de Moivre) | `(r e^{i theta})^n = r^n e^{i n theta}`; replacing `theta` by `theta + 360 k` changes `n theta` by `360 n k`, a whole number of turns |
| n-th roots of c | `abs(c)^{1/n} e^{i (Arg c + 360 k) / n}`, k = 0 .. n - 1; k = n gives k = 0 again (`360 n / n = 360`) |
| Principal root | `abs(w)^{1/n} e^{i Arg(w) / n}` (Def 2.2.8): the home name only |
| Branch with the seam at sigma | the name of z used is the one in `(sigma, sigma + 360]` (`branchArg(z, sigma)`); `z^{1/n} = abs(z)^{1/n} e^{i name / n}`; it jumps exactly across the ray at angle sigma |
| The window rule of the scene | `wrap_to(d, lo) = lo + ((d - lo) mod 360)`, 0 replaced by 360 |

### 6.2 The review problems, worked in both addresses

**1.3.1 Write z = -1 + i sqrt 3 in polar form r(cos theta + i sin theta) and exponential form r e^{i theta}. What is Arg z?**

| Cartesian | Polar |
|---|---|
| x = -1, y = sqrt 3: the dot is one step left and sqrt 3 up, in the second quadrant. `r = sqrt(x^2 + y^2) = sqrt(1 + 3) = 2`. `tan theta = y / x = -sqrt 3`; the reference angle is 60 degrees and the dot is in the second quadrant, so `theta = 180 - 60 = 120 degrees = 2pi/3`. | The move that makes the dot: turn 1 by 120 degrees, stretch to length 2. `z = 2(cos 2pi/3 + i sin 2pi/3) = 2 e^{i 2pi/3}`. |
| Check: `2 cos 120 = 2 (-1/2) = -1`, `2 sin 120 = 2 (sqrt 3 / 2) = sqrt 3`. | `Arg z = 2pi/3`: it lies in (-pi, pi]. `arg z = { 2pi/3 + 2pi k }` = ..., -10pi/3, -4pi/3, 2pi/3, 8pi/3, 14pi/3, ... = (degrees) -600, -240, **120**, 480, 840. |

The names of the staircase in `staircase-roots` are exactly the five of the second row. `fmtAngle(2pi/3)` is `2pi/3`; `toPolar(z)` is `{ r: 2, theta: 2.0943951... }`.

**1.1.1 Compute z1 z2 and z1 / z2 in the form x + iy for z1 = 3 - 2i, z2 = -1 + 4i** (the `rule` beat shows the product and the check).

| Cartesian (the way the video does it) | Polar (the check) |
|---|---|
| `z1 z2`: real part `x1 x2 - y1 y2 = 3(-1) - (-2)(4) = -3 + 8 = 5`; imaginary part `x1 y2 + x2 y1 = 3(4) + (-1)(-2) = 12 + 2 = 14`. **z1 z2 = 5 + 14i.** | `abs(z1) = sqrt 13 = 3.606`, `Arg z1 = -atan(2/3) = -33.690 degrees`; `abs(z2) = sqrt 17 = 4.123`, `Arg z2 = 180 - atan 4 = 104.036 degrees`. |
| `z1 / z2`: denominator `x2^2 + y2^2 = 1 + 16 = 17`; real `(x1 x2 + y1 y2) / 17 = (-3 - 8) / 17 = -11/17`; imaginary `(-x1 y2 + x2 y1) / 17 = (-12 + 2) / 17 = -10/17`. **z1 / z2 = -11/17 - (10/17) i ≈ -0.647 - 0.588i.** | Product: `abs(z1 z2) = sqrt 13 · sqrt 17 = sqrt 221 = 14.866`, `Arg = -33.690 + 104.036 = 70.346 degrees` (no wrapping needed). Quotient: `abs(z1/z2) = sqrt(13/17) = 0.8745`, `Arg = -33.690 - 104.036 = -137.726 degrees`. |
| Check of the product's length: `abs(5 + 14i) = sqrt(25 + 196) = sqrt 221` and `atan2(14, 5) = 70.346 degrees`, both equal to the polar line. | Check of the quotient: `abs((-11 - 10i)/17) = sqrt(121 + 100) / 17 = sqrt 221 / 17 = 0.8745`; `atan2(-10, -11) = -(180 - 42.274) = -137.726 degrees`. |

Which address makes it easy: the numbers are small whole numbers, so multiply in Cartesian (two lines) and use the polar column as the check, which is what the last sentence and the last picture of the `rule` beat say ("Small whole numbers can go either way"; Cartesian on the left,
the polar check on the right). The beats `add` and `mul` show the same two operations on a pair whose picture fits (section 6.3).

**1.3.2 Use polar form to compute (sqrt 3 + i)^10 in Cartesian form.**

| Cartesian (by squaring; the long way) | Polar (the way the video does it) |
|---|---|
| `(sqrt 3 + i)^2 = 3 - 1 + 2 sqrt 3 i = 2 + 2 sqrt 3 i`. `^4 = (2 + 2 sqrt 3 i)^2 = 4 - 12 + 8 sqrt 3 i = -8 + 8 sqrt 3 i`. `^8 = (-8 + 8 sqrt 3 i)^2 = 64 - 192 - 128 sqrt 3 i = -128 - 128 sqrt 3 i`. `^10 = ^8 · ^2 = (-128 - 128 sqrt 3 i)(2 + 2 sqrt 3 i)`: real `-256 + 768 = 512`, imaginary `-256 sqrt 3 - 256 sqrt 3 = -512 sqrt 3`. | `r = sqrt(3 + 1) = 2`, `theta = atan(1 / sqrt 3) = 30 degrees`. `r^10 = 2^10 = 1024`, `10 theta = 300 degrees` = Arg `-60 degrees` after taking off a turn. |
| **= 512 - 512 sqrt 3 i ≈ 512 - 886.81 i.** | `1024 (cos 300 + i sin 300) = 1024 (1/2 - (sqrt 3 / 2) i) = 512 - 512 sqrt 3 i`. **Same.** |
| | **Any name works.** The names of 30 are 30 + 360 k; `10 (30 + 360 k) = 300 + 3600 k`, a whole number (10 k) of turns more. 390 gives 3900 = 300 + 3600; -330 gives -3300 = 300 - 3600. One point. |

Unit test: `pow(sqrt 3 + i, 10) = 512 - 512 sqrt 3 i` to 1e-6, `abs = 1024`, `Arg = -60 degrees` to 1e-9.

**1.4.1 Find and sketch the 5th roots of unity.**

| Cartesian | Polar (the way the video does it) |
|---|---|
| `z^5 = 1` factors as `(z - 1)(z^4 + z^3 + z^2 + z + 1) = 0`; the quartic is the other four roots. In Cartesian they are `cos 72 + i sin 72 = (sqrt 5 - 1)/4 + i sqrt(10 + 2 sqrt 5)/4 ≈ 0.309 + 0.951i`, `cos 144 + i sin 144 = -(sqrt 5 + 1)/4 + i sqrt(10 - 2 sqrt 5)/4 ≈ -0.809 + 0.588i`, and the conjugates `-0.809 - 0.588i`, `0.309 - 0.951i`, plus `1`. | `1 = 1 e^{i 0}`; the names of its angle are `0, 360, 720, ...`; divide each by 5: `0, 72, 144, 216, 288, 360, ...`; the sixth (360) is the first again, so there are five roots: `e^{2 pi i k / 5}`, k = 0 .. 4: angles **0, 72, 144, 216, 288 degrees** (Arg 0, 72, 144, -144, -72), five dots 72 degrees apart on the unit circle. |
| Check: `1 + 2 cos 72 + 2 cos 144 = 1 + 0.618 - 1.618 = 0` (the roots sum to zero). | All but `1` are primitive (`gcd(k, 5) = 1`). Each root to the 5th is `e^{i 360 k} = 1`. |

**1.4.2 Find all the 4th roots of -16. Express in exponential and Cartesian forms.**

| Cartesian | Polar (the way the video does it) |
|---|---|
| `z^4 + 16 = (z^2 - 4i)(z^2 + 4i)`. `z^2 = 4i`: `(a + bi)^2 = 4i` gives `a = b`, `2 a^2 = 4`, `a = ±sqrt 2`: `z = ±(sqrt 2 + sqrt 2 i)`. `z^2 = -4i`: `z = ±(sqrt 2 - sqrt 2 i)`. | `-16 = 16 e^{i 180}`: length 16, Arg 180. Names `180 + 360 k`; divide by 4: `45 + 90 k`; length `16^{1/4} = 2`. Roots `2 e^{i 45}`, `2 e^{i 135}`, `2 e^{i 225}`, `2 e^{i 315}`. |
| **√2 + √2 i, -√2 + √2 i, -√2 - √2 i, √2 - √2 i** (`√2 = 1.414`). | Each is `2 (cos a + i sin a)` with `cos 45 = sin 45 = sqrt 2 / 2`, so `2 (sqrt 2 / 2 + i sqrt 2 / 2) = sqrt 2 + sqrt 2 i`: the same four. |
| Check: `(sqrt 2 + sqrt 2 i)^2 = 2 - 2 + 4i = 4i`, `(4i)^2 = -16`. | Check: `2^4 e^{i 4 · 45} = 16 e^{i 180} = -16`; every root gives `16 e^{i (180 + 360 k)} = -16`. |

**2.2.2 Compute the principal value of the square root of 2i.**

| Cartesian | Polar (the way the video does it) |
|---|---|
| `(a + bi)^2 = 2i`: `a^2 - b^2 = 0`, `2 a b = 2`; so `a = b` and `a^2 = 1`. The two roots are `1 + i` and `-1 - i`; the principal one has `Re >= 0` and is the one on the home step. | `abs(2i) = 2`, `Arg(2i) = 90`. Principal root `abs(w)^{1/2} e^{i Arg(w) / 2} = sqrt 2 e^{i 45}` = `sqrt 2 (sqrt 2 / 2 + i sqrt 2 / 2)` = **1 + i**. |
| Check: `(1 + i)^2 = 1 - 1 + 2i = 2i`. | The other root uses the next name: `(90 + 360) / 2 = 225`: `sqrt 2 e^{i 225} = -1 - i`. Not principal. |

**2.4.1 Find a branch of the cube root of z that is continuous along the negative x-axis.**

| Cartesian | Polar (the way the video does it) |
|---|---|
| The three cube roots of -1 solve `w^3 + 1 = (w + 1)(w^2 - w + 1) = 0`: `w = -1`, `(1 + i sqrt 3)/2`, `(1 - i sqrt 3)/2`, at angles 180, 60 and 300 degrees. A branch must pick one value of `w` at each `z` varying without a jump; at `z = -1` the branch of this problem picks the root whose angle lies in `(0, 120]`, the third of the window (0, 360]: `w = (1 + i sqrt 3)/2` (60 degrees). | `f(z) = abs(z)^{1/3} e^{i theta / 3}` with `0 < theta <= 360` (the seam, where the choice is forced to jump, is the **positive** real axis). Then for `z = -r`: `theta = 180`, `f(-r) = r^{1/3} e^{i 60} = r^{1/3} (1/2 + (sqrt 3 / 2) i)`. Approaching the negative axis from above `theta -> 180-`, from below `theta -> 180+`: both give `e^{i 60}`: **continuous**. |
| Check: `(1/2 + (sqrt 3 / 2) i)^3`: the square is `-1/2 + (sqrt 3 / 2) i`, times `1/2 + (sqrt 3 / 2) i` is `-1/4 - 3/4 = -1`. | The principal branch (window (-180, 180]) jumps there: from above `Arg -> 180`, `f -> e^{i 60}`; from below `Arg -> -180`, `f -> e^{-i 60}`; the two differ by `2 sin 60 = sqrt 3 = 1.732`. The branch of this problem jumps instead across the positive real axis: `e^{i 0}` against `e^{i 120}`. |

### 6.3 The numbers of the beats that carry no review problem

| Beat | Quantity | Cartesian | Polar | Value |
|---|---|---|---|---|
| add | `z + (2 - i)` for `z = -1 + i sqrt 3` | `(-1 + 2) + (sqrt 3 - 1) i` | `r = sqrt(1 + (sqrt 3 - 1)^2) = sqrt(5 - 2 sqrt 3) = 1.2393`; `theta = atan(sqrt 3 - 1) = 36.206 degrees` | `1 + 0.7320508 i` |
| mul | `z (1 + i)` | `(-1 - sqrt 3) + (sqrt 3 - 1) i = -2.7320508 + 0.7320508 i` | `1 + i = sqrt 2 e^{i 45}`; `2 sqrt 2 e^{i (120 + 45)}`; `2 sqrt 2 = 2.8284`, `165 degrees` | the same point (`2.8284 (cos 165 + i sin 165)`, `cos 165 = -0.9659`, `sin 165 = 0.2588`) |
| euler | `e^{i 120}`; `2 e^{i 120}` | `-1/2 + (sqrt 3 / 2) i`; `-1 + i sqrt 3` | the unit circle at 120; stretched to length 2 | `-0.5 + 0.8660 i`; back at z |
| names | the five steps of the dot | | `-600, -240, 120, 480, 840` | `fromPolar(2, name) = z` for each |
| jump | `Arg` along the lap (the home name) | | `wrap_to(ang, -180)`: `129 -> 129`, `180 -> 180`, `200 -> -160`, `273 -> -87`, `560 -> -160` | the name climbs, `Arg` wraps and jumps by 360 once per lap (at 180, then at 540) |
| branch | the name and the cube-root angle | | `sig = -180`: `165 -> 165 (root 55)`, `195 -> -165 (root -55)` (the root jumps by 110); `sig = 0`: `165 -> 165 (55)`, `195 -> 195 (65)` (continuous); at `-1`: `name 180`, `root 60` | `branchRoot(-1, 3, 0) = 1/2 + (sqrt 3 / 2) i` |
| heights | the step bars over `z` (`lw = 2`, `phi = 38 degrees`, one turn = 1.0638 screen units) | | tips at `X = -4.55`, `Y = 0.0763 + h · 1.0638` with `h = hgt(name)`: `-240 -> h 0.3333 (Y 0.4309)`, `120 -> 1.3333 (1.4947)`, `480 -> 2.3333 (2.5585)`, `840 -> 3.3333 (3.6224)` | the floor point of `z` is `(-4.55, 0.0763)` |

### 6.4 Unit-test expectations (U7 and U8 assert these; tolerances in brackets)

| Quantity | Expected |
|---|---|
| `toPolar(-1 + i sqrt 3)` | `r = 2`, `theta = 2pi/3` [1e-12]; `fromPolar(2, 2pi/3) = z` [1e-12]; `mul(2, expi(120 degrees)) = z` [1e-12] |
| `argSet(z, kMin -2, kMax 2)` in degrees, rounded | `[-600, -240, 120, 480, 840]`; `fromPolar(2, name) = z` for k = -3 .. 3 [1e-9] |
| `add(z, 2 - i)` | `1 + (sqrt 3 - 1) i` [1e-12]; `abs = sqrt(5 - 2 sqrt 3)`; `Arg = 36.20602311300311 degrees` [1e-9] |
| `mul(z, 1 + i)` | `-1 - sqrt 3 + (sqrt 3 - 1) i` [1e-12]; `abs = 2 sqrt 2`; `Arg = 165 degrees` [1e-9] |
| 1.1.1 | `mul = 5 + 14i`, `div = -11/17 - (10/17) i` [1e-12]; `abs(z1) abs(z2) = sqrt 221 = abs(5 + 14i)` [1e-12]; `Arg z1 = -33.690067525979785`, `Arg z2 = 104.03624346792648` degrees [1e-9]; `Arg(z1 z2) = Arg z1 + Arg z2` [1e-9] |
| `expi(120 degrees)` | `-0.5 + (sqrt 3 / 2) i` [1e-12] |
| 1.3.2 | `abs(sqrt 3 + i) = 2`, `Arg = 30`; `pow(.., 10) = 512 - 512 sqrt 3 i` [1e-6]; `abs = 1024` [1e-6]; `Arg = -60` [1e-9]; `(10 · name - 300) / 360` is an integer for names 30, 390, -330 |
| 1.4.1 | `rootsOfUnity(5)[k] = fromPolar(1, 2 pi k / 5)` [1e-12]; each to the 5th is 1 [1e-9]; angles 0, 72, 144, 216, 288; `cos 72 = (sqrt 5 - 1)/4`, `sin 72 = sqrt(10 + 2 sqrt 5)/4`, `cos 144 = -(sqrt 5 + 1)/4`, `sin 144 = sqrt(10 - 2 sqrt 5)/4` [1e-12] |
| 1.4.2 | `rootsOf(-16, 4) = [(√2, √2), (-√2, √2), (-√2, -√2), (√2, -√2)]` [1e-12]; each has `abs 2` and 4th power -16 [1e-9] |
| 2.2.2 | `principalRoot(2i, 2) = 1 + i` [1e-12]; `rootsOf(2i, 2)[1] = -1 - i`; `(1 + i)^2 = 2i`; `fromPolar(sqrt 2, 45 degrees) = 1 + i`, at 225 degrees `-1 - i` |
| 2.4.1 | `branchRoot(-1, 3, 0) = 1/2 + (sqrt 3 / 2) i` [1e-12]; `branchArg(-1, 0) = 180 degrees`; the principal branch differs by more than 1.7 across the negative real axis; the branch with seam 0 differs by less than 1e-9 there and by more than 1.7 across the positive axis |
| `wrap_to` (U8, run by Python) | `(180, -180) -> 180`, `(-180, -180) -> 180`, `(195, -180) -> -165`, `(200, -180) -> -160`, `(560, -180) -> -160`, `(-240, -180) -> 120`, `(129, -180) -> 129`, `(273, -180) -> -87`, `(165, 0) -> 165`, `(195, 0) -> 195`, `(180, 0) -> 180`, `(0, 0) -> 360`, `(360, 0) -> 360`, `(-90, 0) -> 270`; each also equals `branchArg(fromPolar(1, d), lo)` in degrees [1e-6] |

---

## 7. Verification plan

Order for the builder: write the two JSON files; copy the scenes (Appendices A and B); `node --test tests/unit/i2-videos-ch1.test.mjs` (no manim needed); render at `-ql` and read the stills;
run the interaction script; then render at `-qm` last, so that `media/video/` ends with the 720p files and the sizes can be recorded.

### 7.1 A1: both scenes render, the captions are the narration

Commands (repo root):

```
node tools/videos/render.mjs --only two-addresses,staircase-roots --quality l      # exit code 0; the last line is "Wrote media/manifest.js (2 video(s), N narrated station(s))."
ls -l media/video/two-addresses.mp4 media/video/two-addresses.vtt media/video/staircase-roots.mp4 media/video/staircase-roots.vtt
for id in two-addresses staircase-roots; do ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 media/video/$id.mp4; done
grep -c -- '-->' media/video/two-addresses.vtt media/video/staircase-roots.vtt
node --test tests/unit/i2-videos-ch1.test.mjs                                       # U10 reads the files and the manifest
node tools/videos/render.mjs --only two-addresses,staircase-roots --quality m      # once, last; the committed files are these
stat -c '%s %n' media/video/two-addresses.mp4 media/video/staircase-roots.mp4
```

| Check | Expected (measured on the prototype) |
|---|---|
| exit code of the `-ql` render | 0; manim prints `Played N animations` for each (about 80 and 100) and no warning |
| the four files exist | yes |
| durations | `159.87` and `168.2` seconds (A1: 120 to 180; the estimate of 5.3 is 160.0 and 168.4) |
| cue counts | `8` and `9`, in the segment order, each cue's text equal to the segment's, the first cue at 0 and each cue starting where the previous one ended (U10; the interaction script checks the same in the browser) |
| `media/manifest.js` | `VIDEOS` has `two-addresses` (station `addresses`, `src media/video/two-addresses.mp4`, `captions media/video/two-addresses.vtt`, `seconds 160`) and `staircase-roots` (station `staircase`, `seconds 166`), both with `narrated: false`, `music: false` |
| sizes at `-ql` | 2.4 MB and 3.9 MB (A1's fallback bound of 4 MB holds, narrowly for the second) |
| sizes at `-qm` | `two-addresses` 3 941 652 bytes, `staircase-roots` 6 499 533 bytes, both far under 15 000 000; record them in the result |

### 7.2 A2 and A4: the unit test, `tests/unit/i2-videos-ch1.test.mjs` (Appendix C)

Run: `node --test tests/unit/i2-videos-ch1.test.mjs` (also part of `npm test`). Ten cases and the four checks of `U11` (the fix round); no manim, no browser; the scenes are read as text. `U7` imports `js/core/complex.js`, `U8` and `U9` run `python3 -I`
(skipped with a message when it is missing), `U10` is skipped until the files are rendered.

| Case | Asserts |
|---|---|
| U1 | for each id, the `self.beat("...")` ids found in the `.py` equal the JSON segment ids and the goal's lists (`intro, cart, polar, same, add, mul, rule, euler` and `intro, names, set, home, jump, power, roots, principal, branch`), each once, in order |
| U2 | `id` equals the file name; `title` non-empty and at most 60 characters; `summary` at least 40 characters; `station` equals `addresses` / `staircase` **and** is one of the registry stations whose `video` is the id (`['home', 'addresses']` and `['staircase']`); `music.prompt` at least 20 characters; `music.seconds` 20 to 40; exactly the keys `id title summary station music segments`; 8 and 9 segments with exactly `id` and `text` |
| U3 | each segment 12 to 60 words (whitespace count) and 12 to 60 by an alphanumeric count; each video 300 to 450 words; the silent length estimate `sum(max(1.5, w / 2.5) + 0.35)` between 125 and 175 s (160.0 and 168.4 now) |
| U4 | the pins: video 1 says `minus one plus i root three` (or `minus 1 plus i root 3`), `Cartesian`, `polar`, `120 degrees`, `length 2` (and `45 degrees`, `165 degrees`); video 2 contains `arg z` and `Arg z` case-sensitively, `72 degrees`, `Capital Arg z`, `Little arg z`; the ear rules: none of the symbols `= ^ _ { } < > + * / \ $ # ~` or the vertical bar, printable ASCII only, trimmed, single spaces, ends in `.` or `?`, no numeral touching a letter |
| U5 | no `#rrggbb` anywhere in either `.py` (comments included); no `rgb(`, `hsl(`, `ManimColor`, `color="..."` and no manim colour constant (`WHITE`, `RED`, ...) in the code; `from lib.palette import ...` present and every name exists in `palette.py` (or is `mix` / `ramp`) and includes `BG INK CART POLAR`; `from lib.narrated import NarratedScene`; exactly one `class Main(NarratedScene):`; `narration_id` equals the file name; `self.camera.background_color = BG` |
| U6 | no `run_time=<number>`; `play(` occurs twice and only in the helper class, never in `Main`; the only `wait(` is `self.s.wait(min(gap, 0.5 * self.t))`; every literal `b.go(frac, length, ...)` has `frac + length <= 0.97`; `Shots.go` asserts the same; no network, subprocess or file access (`requests urllib socket subprocess open( write_text ...`); in every raw string `Arg` is `\operatorname{Arg}`; no `\bar{`, `\conj`, `z^*`, and `\overline` only as `\overline{z}`; `staircase-roots` writes `\operatorname{Arg}`; one method per beat, each opening with `Shots` and `b.pop(` |
| U7 | every number of section 6.4 against `complex.js` |
| U8 | `wrap_to` run by Python on 14 cases equals `branchArg` in degrees |
| U9 | both files parse as Python 3 (`ast.parse`) |
| U11a-d | every `MathTex` has a `color=`; euler's leg labels go `cos` to `r cos` before the stretch and to `2 cos` after it, and `2 cos 120 = -1`, `2 sin 120 = root 3`; `names` keeps its rows through the camera and `power` keeps the ray and labels through the rise (frozen, handed to `roots`); `principal` no longer reads 90 as the half |
| U10 | when `media/video/<id>.vtt` and `.mp4` exist: one cue per segment with its text, cues contiguous from 0, captions end between 120 and 180 s, the file between 200 000 and 15 000 000 bytes, `ffprobe` (when installed) between 120 and 180 s and within 0.6 s of the captions, and `media/manifest.js` lists the video with the right station, `src` and `captions` |

**Negative controls** (run on the final prototype files; the clean files passed all 11 test results of the first build (now 15 with U11a-d); each mutation below was applied alone and made exactly the named cases fail):

| # | Mutation | Fails |
|---|---|---|
| 1 | a hex colour (`#62adf2`) in a docstring of `two-addresses.py` | U5 |
| 2 | `self.beat("mul")` renamed `self.beat("mult")` | U1 |
| 3 | `b.go(0.88, 0.2, ...)` in `staircase-roots.py` (ends after 0.97) | U6 |
| 4 | `self.play(FadeIn(Dot()), run_time=3)` inside `construct` | U6 |
| 5 | `wrap_to` returning `lo + r` (window closed on the wrong side) | U8 |
| 6 | `z = ` (an equals sign) inside the `intro` segment of `two-addresses.json` | U4 (and U10 once rendered, because the captions no longer match) |
| 7 | `turn it 120deg` (a numeral glued to letters; the `120 degrees` count falls too) | U4 (and U10) |
| 8 | the `72 degrees` pin replaced by `seventy two degrees` | U4 (and U10) |
| 9 | `music.seconds` 90 | U2 |
| 10 | `narration_id = "staircase"` | U5 |
| 11 | `from lib.palette import ..., TEAL` (not in `palette.py`) | U5 |
| 12 | `Arg w=90` instead of `\operatorname{Arg} w=90` in a raw string | U6 |

### 7.3 A3 (the browser half): `tests/interact/i2-videos-ch1.mjs` (Appendix D)

Run (each prints `ok` at desktop 1280 and phone 390):

```
node tools/smoke.mjs --route addresses --script tests/interact/i2-videos-ch1.mjs
node tools/smoke.mjs --route staircase --script tests/interact/i2-videos-ch1.mjs
```

| Step | What the script does | Fails when |
|---|---|---|
| 0 | maps the route to its video (`addresses` to `two-addresses`, `staircase` to `staircase-roots`); any other route logs and passes | |
| 1 | `import('./media/manifest.js')` in the page; finds `VIDEOS[id]` | no entry; wrong `station`, `src` or `captions`; `seconds` outside 118 to 182; empty title or a summary under 40 characters |
| 2 | fetches the narration JSON and the `.vtt`; parses the cues | `WEBVTT` header missing; segment ids differ from the goal's; cue count or text differs from the segments; a cue without length; the first cue not at 0 or a cue not starting where the previous ended; captions not ending in 120 to 180 s |
| 3 | fetches the `.mp4` | HTTP not 200; no `ftyp` box at byte 4; size under 200 KB or 15 000 000 bytes and over |
| 4 | waits up to 2.5 s for the station's own `#video-<id>`; if the station does not embed it, builds one with `listen.js` `videoPanel` on a fixture host appended to `#view`; reads the panel | the heading does not start with `Watch (2-3 min)`; the player lacks `controls`, `playsinline` or `preload="metadata"`, or has `autoplay` or `loop`; the `<track>` is not `kind="captions" default` with the manifest's captions path; the `<source>` is not the manifest's `src`; the page scrolls sideways; the panel is under 300 px (phone) or 400 px (desktop) wide, or wider than the viewport |
| 5 | when the browser can decode H.264 (`canPlayType`): the player is 16:9 within 3% (and 280 to `vw - 16` px on a phone); the metadata loads and its `duration` is within 1.5 s of `entry.seconds`. Otherwise it logs that the step is skipped | wrong aspect or duration |

`export const expectedErrors = [/^request failed: \S+\/media\/video\/(?:two-addresses|staircase-roots)\.(?:mp4|vtt)$/]` excuses only the aborted media request that tearing the fixture panel down causes; a missing file still fails
step 3. Passing looks like (prototype with the final 720p files, both routes, `--no-shots`): `4/4 checks passed across 2 route(s).` with the lines `manifest: two-addresses 160 s, station addresses`, `captions: 8 cues, ending at 159.9 s`, `file: 3.76 MB` and `file: 6.20 MB` (the script prints mebibytes: 3.76 for 3.94 million bytes, 6.20 for 6.50 million) for the 720p files,
`panel: 490 px wide` (desktop) or `358 px wide` (phone) for the station's own panel, or `952 px wide, player 918 x 516 px` for the fixture the script builds when a station does not embed the video yet, and `this browser has no H.264 decoder: the 16:9 and metadata checks are skipped`. The harness's Chromium has no H.264 decoder, so
`listen.js` hides the player there (0 x 0 px) and shows its error line; that is the reason for the `canPlay` branch, and the 16:9 and duration checks run on the student's own Chrome or Safari (the real-browser task of the local agent).

### 7.4 A3 (the stills): extraction, and what each still must show

```
mkdir -p docs/review/iter-2/i2-videos-ch1
for id in two-addresses staircase-roots; do node --input-type=module -e '
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const id = process.argv[1];
const segs = JSON.parse(fs.readFileSync(`media/narration/videos/${id}.json`, "utf8")).segments.map((s) => s.id);
const starts = [...fs.readFileSync(`media/video/${id}.vtt`, "utf8").matchAll(/(\d+):(\d+):(\d+)\.(\d+) --> /g)].map((m) => +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000);
starts.forEach((s, i) => {
  for (const off of segs[i] === "jump" || segs[i] === "branch" ? [0.5, 2.5] : [0.5]) {
    const out = `docs/review/iter-2/i2-videos-ch1/${id}-${segs[i]}${off === 0.5 ? "" : "-plus2"}.png`;
    spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(s + off), "-i", `media/video/${id}.mp4`, "-frames:v", "1", out]);
  }
});' $id; done
```

This writes `<id>-<beat>.png` at cue start + 0.5 s for all 17 beats and `<id>-jump-plus2.png`, `<id>-branch-plus2.png` at cue start + 2.5 s. Two numeric aids, for the review, not repo files: the corner pixel,
`ffmpeg -v error -i still.png -vf "crop=1:1:4:4,format=rgb24" -f rawvideo - | od -An -tu1` must read `(12 17 27)` at `-ql` (within 4 of `(13 18 28)`, `BG`; yellowish or black means the background was not set), and a
count of pixels within 60 (sum of channel differences) of `CART` (98 173 242), `POLAR` (255 157 92) and `INK` (233 237 245), measured at 854 x 480 (multiply by 2.25 at 1280 x 720).

What every still must show (the counts were taken on the prototype's `-ql` stills and vary by a few percent with the font; `-qm` has 2.25 times as many pixels):

| Still | Must show | `CART` / `POLAR` pixels (about, at 854 x 480) |
|---|---|---|
| two-addresses `intro` | plane, axes `Re` `Im`, one white dot labelled `z`, card title `One dot` and `z = -1 + i sqrt 3` | 0 / 0 |
| `cart` | the dot at (-1, sqrt 3); two dashed drop lines to the axes; the labels `x = -1` (under the real axis) and `y = sqrt 3` (right of the imaginary axis) in the blue of `CART`; axes and grid blue; card `Cartesian address`, `(x, y) = (-1, sqrt 3)` | 2200 / 0 |
| `polar` | the same dot; an orange ray and an orange 120 degree arc; `r = 2` and `theta = 2pi/3 = 120°` in orange; faint circles and rays; the white unit arrow on the real axis; card `polar address`, `(r, theta) = (2, 2pi/3)`; the Cartesian drop lines only as faint ghosts, their labels gone | 0 / 1900 |
| `same` | both overlays at full strength on one dot (blue drop lines and labels, orange ray, arc and labels); card with both address rows | 330 / 680 |
| `add` | blue lattice of dots, the ghost dot, a blue arrow from z to z + (2 - i) labelled `+(2 - i)`; card `Add: a slide` and the sum | 1900 / 0 |
| `mul` | **a second point turned and stretched**: the ghost `z`, the product dot `z(1 + i)` at 165 degrees and length 2 sqrt 2, a tile at z and its image (turned 45 degrees, bigger, wholly inside the panel) at the product; **arcs stacked**: `120°`, `+45°` and `165°`; a dashed ring through the product; card `Multiply: a move` | 0 / 1900 |
| `rule` | the header "Which address makes this easy?" and two bordered boxes "Cartesian: a slide" (blue) and "polar: a move" (orange); no plane | 4000 / 3400 (the lists are filled in later; the still is the two empty boxes) |
| `euler` | the unit circle (orange) with a point on it, the `cos theta` leg (blue, solid) and the `sin theta` leg (blue, dashed), `theta` and its arc; card `Euler's formula` with `e^{i theta} = cos theta + i sin theta` (left orange, right blue) | 750 / 1100 |
| staircase-roots `intro` | plane from above, circle, axes, the dot and `z`; card `One dot` and `Cartesian: (-1, sqrt 3)` | 180 / 0 (the blue line only) |
| `names` | the ray and three arcs (solid, a spiral, dashed) from the real axis to it; the three rows `theta = 120°`, `theta = 480° = 120° + 360°`, `theta = -240° = 120° - 360°` | 0 / 3750 |
| `set` | **the camera lowered: a pole, step bars all pointing up-left to tips stacked over the dot, tips labelled `-240°`, `120°`, `480°` above the dot (the dot is white, on the floor); title `arg z: the whole set` and `arg z = {120° + 360° k}` | 0 / 1950 |
| `home` | the same, the 120 bar thick with a ring, a bracket on the pole with `180° ]` and `-180° (`, a dashed seam labelled `seam`; card `Arg z: the home step` | 0 / 2450 |
| `jump` at +0.5 s and +2.5 s | **the highlighted bar differs**: at +0.5 s the dot is at 129 degrees and the live numbers read `129°` and `129°` with the home bar inside the upper half of the bracket; at +2.5 s the dot is at 200 degrees, the numbers read `200°` and `-160°`, the home bar is the one inside the lower half of the bracket and two red rings are fading at the bracket's ends (a jump just happened) | 0 / 2300 |
| `power` | bars at `-330°`, `30°`, `390°` over a dot at 30 degrees; title `Powers ignore the name` and `z = sqrt 3 + i = 2 e^{i 30°}` | 60 / 1450 |
| `roots` | **five white dots 72 degrees apart on the unit circle**, rays, a pentagon, five `72°` labels; card `Roots need every name` | 0 / 1750 |
| `principal` | `w = 2i` at the top of the circle (blue label) with its 90 degree arc; **one root emphasised** (white dot with an orange ring, labels `1 + i` in blue and `sqrt 2 at 45°` in orange) **and the other ghosted** (dim, `-1 - i`); a dashed circle of radius sqrt 2 | 100 / 2000 |
| `branch` at +0.5 s and +2.5 s | **the seam ray has moved**: at +0.5 s the dashed seam is on the negative real axis (-179 degrees, the window labels read `181°` and `-179°`); at +2.5 s it points straight down (-92 degrees; labels `268°` and `-92°`) and the window bracket is higher on the pole | 0 / 2300 |

All 17 corner pixels read `(12 17 27)`; the background is the dark theme in every still.

### 7.5 A4: code inspection

U6 automates the inspectable part; the rest is a reading: every `b.go` shot is a fraction of `t` aligned to a sentence of the voice (the tables of 5.5 and 5.7 are the reference); no beat has a bare `run_time`; no `self.wait` outside
`Shots.at`; `narration_id` equals the file name; nothing reaches the network or writes a file; every `MathTex` that writes Arg writes `\operatorname{Arg}`; there is no conjugate in these two videos (the rule, `\overline{z}`, is pinned for any that a later edit adds).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | manim or LaTeX missing | `render.mjs` exits 1 with its own message; nothing is written. The scenes need `amsmath` only (`\operatorname`, `\tfrac`, `\sqrt[4]{}`, `\div`, `\dots`, `\text`); manim's default template needs its usual TeX packages |
| E2 | the real audio exists (local re-render) | `beat_length` becomes clip length plus 0.35 s; every shot is a fraction, so sync holds. A clip longer than the estimate stretches the beat; the pad grows, never a shot. The A3 stills are taken on the silent render |
| E3 | the voiced video runs past 3 minutes | `staircase-roots` has 413 words, which is 168 s at the recipe's 2.5 words per second; a voice at 2.2 words per second would give about 185 s (CONSTRAINTS: keep each video under about 3 minutes). The unit test keeps the text under 450 words; if the real clips run long, the local agent trims `roots` or `branch` (the two longest), and a text change is picked up by the clip hash |
| E4 | a shot starts late (a frame rounding) | `Shots.at` schedules against the beat clock; the assert keeps the end before 0.97 t; a late shot shortens its own pad only |
| E5 | `FadeIn` on an `always_redraw` mobject | forbidden (D4): the redraw undoes it. Parts fade through `vis`; a part with its own `FadeIn` in the scenes is static (a `Dot`, a `MathTex`) |
| E6 | `DecimalNumber` digits hidden behind the card | D8: each update re-applies `set_z_index(21)` |
| E7 | a font with wider glyphs (the student's Mac) | `card_line` and `card_title` shrink a mobject wider than 5.6 units; in-plane labels have at least 0.9 units of slack |
| E8 | the frame mask hides a label placed outside the panel | every in-plane label was placed inside the panel at its final position (the `seam` label at 1.15 L, not 1.78 L, which the prototype hid); the stills prove it |
| E9 | `ang` crossing the seam while `sig` slides | the home name changes only if the dot crosses the window's edge; sliding `sig` from -180 to 0 with the dot at 165 degrees keeps `wrap_to` constant at 165 (the scene relies on it: no spurious red ring) |
| E10 | `wrap_to(0, 0)` | 360, not 0: the window is closed at the top, as `branchArg` |
| E11 | a very short or long beat | beats run 15.5 to 21.9 s; a flash lasts 0.9 s and the largest tilt 1.6 s; no shot is shorter than 1.5 s |
| E12 | the render is interrupted | `render.mjs` returns 1; re-run; `--disable_caching` means no stale partial file is reused. (Another process killed a `-qm` render once on the shared box: exit 143; the re-run was clean) |
| E13 | `media/manifest.js` is regenerated while other goals' videos exist | `writeManifest` lists every `videos/scenes/<id>.py` that has an `.mp4`; this goal's two entries are unaffected |

### 8.2 Performance plan (the render, not a page)

| Item | Measured on the prototype (a shared box; other agents render at the same time) |
|---|---|
| `two-addresses` `-ql` | 160 s of video, 2.4 MB, about 2 minutes |
| `two-addresses` `-qm` | 3.94 MB, 1.8 minutes of CPU (7 minutes of wall time on the busy box) |
| `staircase-roots` `-ql` | 166.2 s, 3.9 MB, about 2.5 minutes of CPU (4 to 11 minutes of wall time on the busy box) |
| `staircase-roots` `-qm` | 6.5 MB, 5.5 minutes of CPU (the wall time on the busy box was 10 to 15 minutes) |
| frames | 160 s at 30 fps is 4 800 frames; `staircase-roots` rebuilds about 20 mobjects per frame (its stage is `always_redraw`) which is why it costs three times `two-addresses` |

Why the size is safe: simple vector pictures on a flat background compress to about 1 KB per frame at 720p30 (6.5 MB over 4 986 frames for the busier video), against a limit of 15 MB. How to keep the loop fast: iterate with
`-ql` (a quarter of the pixels, half the frames); `--disable_caching` is passed by `render.mjs` so LaTeX is recompiled each time (about 20 s for 60 formulas); run both videos in sequence, not in parallel (they share manim's `Tex` cache directory).

### 8.3 Accessibility

- **Captions** are the narration, on by default (`<track default>`), so a silent render and a hearing-impaired viewer get the whole text; the cue text is exactly the segment text.
- **Contrast** (section 3.1): every text and mark colour is at least 5.9 : 1 against its background (`SEAM` on the card is the lowest).
- **Not by colour alone**: every coloured mark has a label (`x = -1`, `r = 2`, `120°`, `seam`, `Arg z`); the Cartesian and polar columns are named "Cartesian" and "polar" in words; the window's inclusive and exclusive edges are a solid and a dashed edge **and** the characters `]` and `(`.
- **Flashing**: at most one ring or flash per 1.8 s, each fading over 0.9 s, none above 3 Hz; no strobing, no full-frame flash.
- **Screen reader**: the player is native; the panel's heading and summary (from the manifest's title and summary) describe the video; the summaries say what each video is for.

### 8.4 Reduced motion

A video is started by the viewer (no autoplay, no loop, enforced by the interaction script), and its motion is its content. Nothing moves faster than a dot circling the origin in 8 seconds or a tilt of 1.4 s; there is no camera shake, no
parallax and no spinning text. A viewer who wants no motion pauses on a beat's opening picture (the still contract makes every beat's first 0.3 s a complete picture) and reads the card; the captions and the card carry the same content.

### 8.5 Phone layout

The panel is 358 px wide and the player 324 x 182 at 390 px (a 0.253 scale of 1280). Plane labels are 8 to 11 px high, titles about 9 px, legends 6 to 7 px (they only repeat the voice). The captions are the text track and fullscreen is one tap
(`playsinline` keeps the page layout on iOS until the viewer asks for fullscreen). The interaction script asserts that the panel fits (no sideways scroll, 300 to 390 px).

---

## 9. Out of scope, and requests for other owners

**Out of scope** (the goal's own list): audio (generated on the student's machine with `npm run media`); embedding in the stations (`i2-decisions-everywhere` and `i2-pictures` call `videoPanel`; the panel appears when the manifest has the entry);
the other three videos (`i2-videos-ch2`, `i2-videos-4d`). Also out: a Listen control for the videos (the video carries its own audio), subtitles in other languages, burned-in captions, and any interactive element inside the frame.

**Requests for other owners** (none blocks the goal):

1. `tools/smoke.mjs` (orchestrator): the static server has no MIME entries for `.mp4`, `.vtt`, `.mp3` and no `Range` support (`i2-media-core` raised it as E19). The interaction script reads these files with `fetch`, which does not care; a script that wanted to
   play the video in the harness would. The harness's Chromium also has no H.264 decoder; the real-browser review (local agent) is where the 16:9 and duration steps run.
2. `docs/ARCHITECTURE.md` 11.8 (integrator): promote the sentence "a beat's opening picture is on screen within 0.3 s, and a still at cue start + 0.5 s shows it" (D1) into the media notes; the three remaining video goals use the same `Shots` helper and the same rule.
3. `i2-media-core` (already landed): nothing needed. `palette.py` has every name used; the `mix` and `ramp` helpers are unused here.

---

## 10. Build record (iteration 2, builder)

Built exactly as designed: `videos/scenes/two-addresses.py`, `videos/scenes/staircase-roots.py`, both narration JSON files, `tests/unit/i2-videos-ch1.test.mjs` and
`tests/interact/i2-videos-ch1.mjs` are Appendices A to D and section 4.3 copied verbatim (the JSON re-serialised with two-space indent; word totals 393 and 408). No deviation.

| Check | Result on the repo build |
|---|---|
| `node --test tests/unit/i2-videos-ch1.test.mjs` | 11 of 11 results pass (U10 ran against the rendered files) |
| `-ql` render (`node tools/videos/render.mjs --only two-addresses,staircase-roots --quality l`) | exit 0; 82 and 106 animations; 159.87 s and 166.20 s; 2 405 555 and 3 876 444 bytes; 8 and 9 cues |
| `-qm` render (the committed files) | 1280 x 720 at 30 fps; `two-addresses` 3 941 652 bytes, `staircase-roots` 6 499 533 bytes (both far under 15 000 000); 159.87 s and 166.20 s |
| Stills at cue start + 0.5 s (and + 2.5 s for `jump` and `branch`), `docs/review/iter-2/i2-videos-ch1/<id>-<beat>.png`, taken from the `-qm` files | all 19 corner pixels `(12 17 27)`; each shows what section 7.4 lists, including the jump pair (`129°` and `129°`, then `200°` and `-160°` with two red rings) and the branch pair (seam at -179 degrees, then straight down with labels `268°` and `-92°`) |
| `node tools/smoke.mjs --route addresses,staircase --script tests/interact/i2-videos-ch1.mjs` | 4 of 4 (desktop and phone, both routes); the stations already embed the panel (`video-two-addresses`, `video-staircase-roots`), 490 px wide on desktop and 358 px on a phone; the harness's Chromium has no H.264 decoder, so the panel shows its error line and the 16:9 and metadata steps are skipped |
| `npm test` | one failure outside this goal: `architecture-sync` 3.12 (`helixPoint` exported from `js/core/three-view.js` and not mentioned in ARCHITECTURE 3.12), another builder's in-flight change |

Looking at the stills: the `Text` face falls back to a serif on this box (manim's default has no sans here); nothing overflows, because `card_line` and `card_title` shrink wide lines. In `mul` the turned target tile touches the panel's left edge by a few pixels, and in the `polar` still the faint Cartesian ghosts lie under the orange labels; both are as in the prototype and neither hides a mark.

---

## Appendix A. `videos/scenes/two-addresses.py` (validated reference implementation)

Rendered at `-ql` and `-qm` with manim Community v0.22.0; the stills of section 7.4 were taken from this file. Copy it; where section 5 is thinner than the code, the code is the reference.

```python
"""Video 1, two-addresses: one dot, reached two ways (a slide and a move). Station: addresses.

Narration: media/narration/videos/two-addresses.json. Eight beats, one per segment, in the JSON's order.
Every beat opens on its own picture within half a second (so a still taken at the cue start shows it), then
re-enacts the construction on top of that picture. Colours come only from lib.palette: CART for everything
Cartesian, POLAR for everything polar, INK for the point z.
"""
import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, OK

S3 = 3 ** 0.5
S2 = 2 ** 0.5
TAU = 2 * np.pi
Z = (-1.0, S3)                     # the dot: -1 + i sqrt(3) = 2 e^{i 2 pi / 3}
U = 1.0                            # screen units per plane unit (intro to mul)
UE = 1.55                          # the same in the euler beat (zoomed in on the unit circle)
O = np.array([-3.3, -0.4, 0.0])    # screen position of the origin
PANEL_W, PANEL_H = 6.9, 6.0
CARD_X, CARD_W, CARD_H = 3.75, 6.3, 6.0


def P(x, y=0.0, u=U):
    """Plane point (x, y) as a screen point."""
    return O + u * np.array([x, y, 0.0])


def polar_pt(r, deg, u=U):
    a = np.radians(deg)
    return P(r * np.cos(a), r * np.sin(a), u)


def tex(s, color=INK, size=44, **kw):
    return MathTex(s, color=color, font_size=size, **kw)


def words(s, color=INK, size=32, weight=NORMAL):
    return Text(s, color=color, font_size=size, weight=weight)


class Shots:
    """Schedules the shots of one beat as fractions of the beat's length t (in seconds)."""

    def __init__(self, scene, t):
        self.s, self.t, self.t0 = scene, t, scene.renderer.time

    def elapsed(self):
        return self.s.renderer.time - self.t0

    def at(self, frac):
        """Idle until the beat is `frac` of the way through (never more than half a beat at once)."""
        gap = frac * self.t - self.elapsed()
        if gap > 0.1:
            self.s.wait(min(gap, 0.5 * self.t))

    def go(self, frac, length, *anims, **kw):
        """Start a shot at `frac` of the beat and let it last `length` of the beat."""
        assert 0 < length and frac + length <= 0.97, "a shot must end before the last 3% of its beat"
        self.at(frac)
        self.s.play(*anims, run_time=length * self.t, **kw)

    def pop(self, *anims):
        """The opening picture of the beat: on screen within 0.3 s."""
        self.s.play(*anims, run_time=min(0.3, 0.02 * self.t))


class Main(NarratedScene):
    narration_id = "two-addresses"

    # ------------------------------------------------------------------ the plane and the card
    def stage(self, u=U):
        grid = VGroup(
            *[Line(P(x, -3, u), P(x, 3, u)) for x in range(-5, 6) if x != 0],
            *[Line(P(-5, y, u), P(5, y, u)) for y in range(-4, 5) if y != 0],
        ).set_stroke(color=MUTED, width=1.2, opacity=0.2)
        axes = VGroup(Line(P(-5, 0, u), P(5, 0, u)), Line(P(0, -4, u), P(0, 4, u))).set_stroke(color=MUTED, width=2.5, opacity=0.9)
        return grid, axes

    def setup_stage(self):
        c = O + np.array([0.0, 0.2, 0.0])
        self.panel = Rectangle(width=PANEL_W, height=PANEL_H, fill_color=SURFACE, fill_opacity=0.6, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to(c)
        hole = Rectangle(width=PANEL_W, height=PANEL_H).move_to(c)
        # everything that slides or grows past the panel is hidden by this frame (BG with a hole)
        self.mask = Cutout(Rectangle(width=16, height=9), hole, fill_color=BG, fill_opacity=1, stroke_width=0).set_z_index(10)
        self.grid, self.axes = self.stage()
        self.axis_names = VGroup(words("Re", MUTED, 30).move_to(P(2.9, -0.35)), words("Im", MUTED, 30).move_to(P(0.4, 2.7)))
        self.card = RoundedRectangle(corner_radius=0.2, width=CARD_W, height=CARD_H, fill_color=SURFACE, fill_opacity=1, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to([CARD_X, c[1], 0]).set_z_index(20)
        self.kicker = words("One point, two addresses", MUTED, 30).move_to([-3.3, 3.45, 0]).set_z_index(21)
        self.dot = Dot(P(*Z), radius=0.13, color=INK).set_z_index(8)
        self.zlab = tex("z", INK, 48).next_to(self.dot, UP, buff=0.12).shift(LEFT * 0.15).set_z_index(8)

    def card_title(self, text, color):
        m = words(text, color, 36, BOLD)
        if m.width > CARD_W - 0.8:
            m.scale_to_fit_width(CARD_W - 0.8)
        return m.move_to([CARD_X - CARD_W / 2 + 0.4, 2.35, 0], aligned_edge=LEFT).set_z_index(21)

    def card_line(self, mob, row):
        """Left-aligned line `row` of the card (row 0 is just under the title); wider lines are shrunk to fit."""
        if mob.width > CARD_W - 0.8:
            mob.scale_to_fit_width(CARD_W - 0.8)
        mob.set_z_index(21)
        return mob.move_to([CARD_X - CARD_W / 2 + 0.4, 1.45 - 0.98 * row, 0], aligned_edge=LEFT)

    # ------------------------------------------------------------------ marks
    def cart_marks(self):
        drops = VGroup(DashedLine(P(*Z), P(Z[0], 0), color=CART, stroke_width=4, dash_length=0.12),
                       DashedLine(P(*Z), P(0, Z[1]), color=CART, stroke_width=4, dash_length=0.12))
        labels = VGroup(tex(r"x=-1", CART, 44).next_to(P(Z[0], 0), DOWN, buff=0.12),
                        tex(r"y=\sqrt{3}", CART, 44).next_to(P(0, Z[1]), RIGHT, buff=0.15))
        return drops, labels

    def polar_marks(self):
        ray = Line(O, P(*Z), color=POLAR, stroke_width=6)
        arc = Arc(radius=0.9, start_angle=0, angle=TAU / 3, arc_center=O, color=POLAR, stroke_width=6)
        th = tex(r"\theta=\tfrac{2\pi}{3}=120^\circ", POLAR, 42).move_to(P(1.55, 1.15)).set_z_index(8)
        r = tex(r"r=2", POLAR, 44).move_to(P(-1.62, 0.55)).set_z_index(8)
        return VGroup(ray, arc), VGroup(th, r)

    def polar_grid(self, rings=(1, 2), reach=2.6):
        rs = VGroup(*[Circle(radius=r * U, arc_center=O, color=POLAR, stroke_width=1.6, stroke_opacity=0.35) for r in rings])
        ys = VGroup(*[Line(O, polar_pt(reach, a), color=POLAR, stroke_width=1.2, stroke_opacity=0.22) for a in range(0, 360, 30)])
        return VGroup(rs, ys)

    # ------------------------------------------------------------------ the film
    def construct(self):
        self.camera.background_color = BG
        self.setup_stage()
        with self.beat("intro") as t:
            self.intro(t)
        with self.beat("cart") as t:
            self.cart(t)
        with self.beat("polar") as t:
            self.polar(t)
        with self.beat("same") as t:
            self.same(t)
        with self.beat("add") as t:
            self.add_beat(t)
        with self.beat("mul") as t:
            self.mul(t)
        with self.beat("rule") as t:
            self.rule(t)
        with self.beat("euler") as t:
            self.euler(t)

    # ------------------------------------------------------------------ beats
    def intro(self, t):
        b = Shots(self, t)
        title = self.card_title("One dot", INK)
        zeq = self.card_line(tex(r"z=-1+i\sqrt{3}", INK, 58), 0)
        q1 = self.card_line(words("Where is it?", MUTED, 34), 1.5)
        chip_c = RoundedRectangle(corner_radius=0.15, width=5.4, height=0.9, stroke_color=CART, stroke_width=3, fill_opacity=0).move_to([CARD_X, -0.65, 0]).set_z_index(21)
        chip_p = RoundedRectangle(corner_radius=0.15, width=5.4, height=0.9, stroke_color=POLAR, stroke_width=3, fill_opacity=0).move_to([CARD_X, -1.85, 0]).set_z_index(21)
        tc = words("Cartesian address", CART, 32, BOLD).move_to(chip_c).set_z_index(22)
        tp = words("polar address", POLAR, 32, BOLD).move_to(chip_p).set_z_index(22)
        b.pop(FadeIn(self.panel), FadeIn(self.mask), FadeIn(self.grid), FadeIn(self.axes), FadeIn(self.axis_names), FadeIn(self.dot),
              FadeIn(self.zlab), FadeIn(self.card), FadeIn(self.kicker), FadeIn(title), FadeIn(zeq))
        b.go(0.25, 0.20, Flash(self.dot, color=INK, flash_radius=0.5), Indicate(self.dot, scale_factor=1.8, color=INK))
        b.go(0.48, 0.14, FadeIn(q1))
        b.go(0.66, 0.12, Create(chip_c), FadeIn(tc))
        b.go(0.78, 0.12, Create(chip_p), FadeIn(tp))
        self.intro_mobs = VGroup(title, zeq, q1, chip_c, chip_p, tc, tp)

    def cart(self, t):
        b = Shots(self, t)
        drops, labels = self.cart_marks()
        title = self.card_title("Cartesian address", CART)
        pair = self.card_line(tex(r"(x,\,y)=\left(-1,\ \sqrt{3}\right)", CART, 48), 0)
        a1 = Arrow(P(0, 0), P(Z[0], 0), buff=0, color=CART, stroke_width=9, tip_length=0.28, max_tip_length_to_length_ratio=0.5).set_z_index(7)
        a2 = Arrow(P(Z[0], 0), P(*Z), buff=0, color=CART, stroke_width=9, tip_length=0.28).set_z_index(7)
        l1 = words("left 1", CART, 32).move_to(P(-0.4, 0.3))
        l2 = words("up √3", CART, 32).move_to(P(-1.85, 0.95))
        z_line = self.card_line(tex(r"z=x+iy=-1+i\sqrt{3}", CART, 46), 1)
        slide = self.card_line(words("a slide: left 1, then up √3", CART, 32), 2)
        legend = self.card_line(words("blue = Cartesian: drop lines, axes, grid", CART, 28), 3.4)
        b.pop(FadeOut(self.intro_mobs), FadeIn(title), FadeIn(pair), Create(drops), FadeIn(labels),
              self.axes.animate.set_stroke(color=CART), self.grid.animate.set_stroke(color=CART, opacity=0.24))
        b.go(0.16, 0.12, Create(a1))
        b.go(0.29, 0.14, FadeIn(l1), Create(a2), FadeIn(l2))
        b.go(0.45, 0.2, Write(z_line))
        b.go(0.62, 0.14, FadeIn(slide))
        b.go(0.78, 0.12, FadeIn(legend))
        self.cart_group = VGroup(drops, labels)
        self.cart_card = VGroup(title, pair, z_line, slide, legend)
        self.cart_tracers = VGroup(a1, a2, l1, l2)

    def polar(self, t):
        b = Shots(self, t)
        ray_arc, labels = self.polar_marks()
        pgrid = self.polar_grid()
        title = self.card_title("polar address", POLAR)
        pair = self.card_line(tex(r"(r,\,\theta)=\left(2,\ \tfrac{2\pi}{3}\right)", POLAR, 48), 0)
        l_turn = self.card_line(tex(r"\text{turn }\theta=120^\circ", POLAR, 44), 1)
        l_str = self.card_line(tex(r"\text{stretch to }r=2", POLAR, 44), 2)
        legend = self.card_line(words("orange = polar: ray, arc, circles", POLAR, 28), 3.4)
        ang, ln = ValueTracker(0.0), ValueTracker(1.0)          # the unit move: turn (degrees), then stretch (length)
        vec = always_redraw(lambda: Arrow(O, O + U * ln.get_value() * np.array([np.cos(np.radians(ang.get_value())), np.sin(np.radians(ang.get_value())), 0]),
                                          buff=0, color=INK, stroke_width=9, tip_length=0.26, max_tip_length_to_length_ratio=0.45).set_z_index(9))
        b.pop(FadeOut(self.cart_card), FadeOut(self.cart_tracers), FadeIn(title), FadeIn(pair),
              self.cart_group.animate.set_opacity(0.2), self.axes.animate.set_stroke(color=MUTED, opacity=0.9), self.grid.animate.set_stroke(color=MUTED, opacity=0.14),
              FadeIn(pgrid), Create(ray_arc), FadeIn(labels), FadeIn(vec))
        b.go(0.2, 0.23, ang.animate.set_value(120.0), FadeIn(l_turn))
        b.go(0.45, 0.17, ln.animate.set_value(2.0), FadeIn(l_str))
        b.go(0.64, 0.05, FadeOut(vec))
        b.go(0.78, 0.12, FadeIn(legend))
        self.remove(vec)
        self.polar_group = VGroup(ray_arc, labels, pgrid)
        self.polar_card = VGroup(title, pair, l_turn, l_str, legend)

    def same(self, t):
        b = Shots(self, t)
        title = self.card_title("Same dot", INK)
        rc = self.card_line(tex(r"(x,\,y)=\left(-1,\ \sqrt{3}\right)", CART, 46), 0)
        rp = self.card_line(tex(r"(r,\,\theta)=\left(2,\ \tfrac{2\pi}{3}\right)", POLAR, 46), 1)
        ex = self.card_line(MathTex(r"-1", r"=", r"2\cos 120^\circ", font_size=46), 2.1)
        ex[0].set_color(CART)
        ex[2].set_color(POLAR)
        ey = self.card_line(MathTex(r"\sqrt{3}", r"=", r"2\sin 120^\circ", font_size=46), 3.0)
        ey[0].set_color(CART)
        ey[2].set_color(POLAR)
        ok = self.card_line(words("one dot, two addresses, they agree", OK, 30), 4.0)
        b.pop(FadeOut(self.polar_card), FadeIn(title), FadeIn(rc), FadeIn(rp), self.cart_group.animate.set_opacity(1))
        b.go(0.09, 0.11, Indicate(self.dot, scale_factor=1.8, color=INK))
        b.go(0.21, 0.13, Indicate(self.cart_group, color=CART, scale_factor=1.0))
        b.go(0.36, 0.17, Indicate(self.polar_group, color=POLAR, scale_factor=1.0))
        b.go(0.55, 0.12, Write(ex))
        b.go(0.67, 0.12, Write(ey))
        b.go(0.82, 0.1, FadeIn(ok))
        self.same_card = VGroup(title, rc, rp, ex, ey, ok)

    def add_beat(self, t):
        b = Shots(self, t)
        w = (2.0, -1.0)                                           # the slide: 2 - i
        zn = (Z[0] + w[0], Z[1] + w[1])
        title = self.card_title("Add: a slide", CART)
        l1 = self.card_line(tex(r"(-1+i\sqrt{3})+(2-i)", CART, 44), 0)
        l2 = self.card_line(tex(r"=(-1+2)+(\sqrt{3}-1)\,i", CART, 44), 1)
        l3 = self.card_line(tex(r"=1+(\sqrt{3}-1)\,i\approx 1+0.73i", CART, 44), 2)
        hint = self.card_line(words("in polar: r ≈ 1.24, θ ≈ 36.2°, no tidy rule", POLAR, 28), 3.4)
        lattice = VGroup(*[Dot(P(x, y), radius=0.05, color=CART).set_opacity(0.6) for x in range(-5, 6) for y in range(-4, 5)])
        ghost = Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.4)
        arrow = Arrow(P(*Z), P(*zn), buff=0.13, color=CART, stroke_width=8, tip_length=0.26).set_z_index(7)
        wl = tex(r"+(2-i)", CART, 42).next_to(arrow.get_center(), UP, buff=0.18).shift(RIGHT * 0.25).set_z_index(8)
        zl = tex(r"z+(2-i)", INK, 40).move_to(P(zn[0] + 0.1, zn[1]) + np.array([0.95, 0.35, 0]))
        b.pop(FadeOut(self.same_card), FadeOut(self.cart_group), FadeOut(self.polar_group), FadeOut(self.zlab),
              self.grid.animate.set_stroke(color=CART, opacity=0.2), self.axes.animate.set_stroke(color=CART, opacity=0.9),
              FadeIn(title), FadeIn(l1), FadeIn(lattice), FadeIn(ghost), Create(arrow), FadeIn(wl))
        carried = VGroup(lattice, self.dot)
        b.go(0.1, 0.3, carried.animate.shift(U * np.array([w[0], w[1], 0.0])), FadeOut(wl))
        b.go(0.4, 0.04, FadeIn(zl))
        b.go(0.43, 0.12, Write(l2))
        b.go(0.57, 0.1, Write(l3))
        b.go(0.72, 0.12, FadeIn(hint))
        self.add_stuff = VGroup(title, l1, l2, l3, hint, lattice, ghost, arrow, zl)

    def mul(self, t):
        b = Shots(self, t)
        res = (-1 - S3, S3 - 1)                                   # z (1 + i) = (-1 - sqrt 3) + (sqrt 3 - 1) i
        rr = 2 * S2
        res_pt = polar_pt(rr, 165)
        title = self.card_title("Multiply: a move", POLAR)
        l1 = self.card_line(tex(r"\times(1+i)=\sqrt{2}\,e^{i\,45^\circ}", POLAR, 44), 0)
        l2 = self.card_line(tex(r"120^\circ+45^\circ=165^\circ", POLAR, 44), 1)
        l3 = self.card_line(tex(r"2\cdot\sqrt{2}=2\sqrt{2}", POLAR, 44), 2)
        l4 = self.card_line(tex(r"z(1+i)\approx-2.73+0.73i", CART, 44), 3.1)
        lat = self.polar_grid(rings=(1, 2), reach=2.7)
        tile = Square(side_length=0.8, color=POLAR, stroke_width=3, fill_opacity=0.25).move_to(P(*Z)).set_z_index(5)
        target = Square(side_length=0.8 * S2, color=POLAR, stroke_width=2.5, fill_opacity=0.12).rotate(np.radians(45)).move_to(res_pt).set_z_index(5)
        z0 = Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.45).set_z_index(6)
        zl0 = tex("z", INK, 44).set_opacity(0.55).next_to(P(*Z), UP, buff=0.12).shift(LEFT * 0.15)
        prod = Dot(res_pt, radius=0.13, color=INK).set_z_index(8)
        prod_l = tex(r"z(1+i)", INK, 42).move_to(P(res[0] + 0.55, -0.5))
        a1 = Arc(radius=0.62, start_angle=0, angle=np.radians(120), arc_center=O, color=POLAR, stroke_width=6)
        a2 = Arc(radius=0.95, start_angle=np.radians(120), angle=np.radians(45), arc_center=O, color=POLAR, stroke_width=6)
        a3 = Arc(radius=1.3, start_angle=0, angle=np.radians(165), arc_center=O, color=POLAR, stroke_width=3, stroke_opacity=0.7)
        t1 = tex(r"120^\circ", POLAR, 36).move_to(polar_pt(0.92, 55))
        t2 = tex(r"+45^\circ", POLAR, 36).move_to(polar_pt(1.32, 143))
        t3 = tex(r"165^\circ", POLAR, 38).move_to(polar_pt(1.75, 85))
        ring = DashedVMobject(Circle(radius=rr * U, arc_center=O, color=POLAR, stroke_width=2.5, stroke_opacity=0.7), num_dashes=48)
        b.pop(FadeOut(self.add_stuff), FadeOut(self.dot), FadeIn(title), FadeIn(l1),
              self.grid.animate.set_stroke(color=MUTED, opacity=0.14), self.axes.animate.set_stroke(color=MUTED, opacity=0.9),
              FadeIn(lat), FadeIn(tile), FadeIn(target), FadeIn(z0), FadeIn(zl0), FadeIn(prod), FadeIn(prod_l),
              Create(a1), Create(a2), Create(a3), FadeIn(t1), FadeIn(t2), FadeIn(t3), Create(ring))
        self.remove(self.dot)
        carried = VGroup(lat, tile, Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.6).set_z_index(7))
        b.go(0.1, 0.22, Rotate(carried, np.radians(45), about_point=O), FadeIn(l2))          # turn the whole plane by 45 degrees
        b.go(0.34, 0.2, carried.animate.scale(S2, about_point=O), FadeIn(l3))                 # then stretch it by root two
        b.go(0.58, 0.12, FadeIn(l4))
        b.go(0.74, 0.1, FadeOut(carried[0]))
        self.mul_stuff = VGroup(title, l1, l2, l3, l4, z0, zl0, prod, prod_l, a1, a2, a3, t1, t2, t3, ring, carried, target)

    def rule(self, t):
        b = Shots(self, t)
        head = words("Which address makes this easy?", INK, 44, BOLD).move_to([0, 3.3, 0]).set_z_index(22)
        box_c = RoundedRectangle(corner_radius=0.2, width=6.5, height=3.3, stroke_color=CART, stroke_width=4, fill_color=SURFACE, fill_opacity=1).move_to([-3.65, 1.0, 0]).set_z_index(20)
        box_p = RoundedRectangle(corner_radius=0.2, width=6.5, height=3.3, stroke_color=POLAR, stroke_width=4, fill_color=SURFACE, fill_opacity=1).move_to([3.65, 1.0, 0]).set_z_index(20)
        tc = words("Cartesian: a slide", CART, 38, BOLD).move_to([-3.65, 2.2, 0]).set_z_index(22)
        tp = words("polar: a move", POLAR, 38, BOLD).move_to([3.65, 2.2, 0]).set_z_index(22)
        ic = VGroup(tex(r"z_1+z_2,\quad z_1-z_2", CART, 44), tex(r"|z_1-z_2|\ \text{(distance)}", CART, 42)).arrange(DOWN, buff=0.4).move_to([-3.65, 0.8, 0]).set_z_index(22)
        ip = VGroup(tex(r"z_1z_2,\quad z_1/z_2", POLAR, 44), tex(r"z^n,\quad \sqrt[n]{z}", POLAR, 44)).arrange(DOWN, buff=0.4).move_to([3.65, 0.8, 0]).set_z_index(22)
        back = CurvedDoubleArrow(box_c.get_bottom() + DOWN * 0.1 + RIGHT * 1.2, box_p.get_bottom() + DOWN * 0.1 + LEFT * 1.2,
                                 angle=TAU / 7, color=INK, stroke_width=4, tip_length=0.2).set_z_index(22)
        back_l = words("do the work there, then translate back", INK, 30).move_to([0, -1.55, 0]).set_z_index(22)
        ex_h = words("small whole numbers: either way", MUTED, 28).move_to([0, -2.15, 0]).set_z_index(22)
        ex_c = tex(r"(3-2i)(-1+4i)=5+14i", CART, 42).move_to([-3.65, -2.9, 0]).set_z_index(22)
        ex_p = tex(r"\sqrt{13}\cdot\sqrt{17}=\sqrt{221}=|5+14i|", POLAR, 38).move_to([3.65, -2.9, 0]).set_z_index(22)
        old = VGroup(self.panel, self.mask, self.grid, self.axes, self.axis_names, self.card, self.kicker, self.mul_stuff, self.cart_group, self.polar_group)
        b.pop(FadeOut(old), FadeIn(head), FadeIn(box_c), FadeIn(box_p), FadeIn(tc), FadeIn(tp))
        b.go(0.27, 0.18, FadeIn(ic))
        b.go(0.48, 0.18, FadeIn(ip))
        b.go(0.68, 0.14, Create(back), FadeIn(back_l))
        b.go(0.82, 0.12, FadeIn(ex_h), FadeIn(ex_c), FadeIn(ex_p))
        self.rule_stuff = VGroup(head, box_c, box_p, tc, tp, ic, ip, back, back_l, ex_c, ex_p, ex_h)

    def euler(self, t):
        b = Shots(self, t)
        ang, rad = ValueTracker(40.0), ValueTracker(1.0)          # the point e^{i theta}: angle in degrees, then stretched to length 2

        def ppt():
            a = np.radians(ang.get_value())
            return P(rad.get_value() * np.cos(a), rad.get_value() * np.sin(a), UE)

        def foot():
            return P(rad.get_value() * np.cos(np.radians(ang.get_value())), 0, UE)

        grid, axes = self.stage(UE)
        grid.set_stroke(color=MUTED, opacity=0.16)
        circ = Circle(radius=UE, arc_center=O, color=POLAR, stroke_width=4)
        circ2 = DashedVMobject(Circle(radius=2 * UE, arc_center=O, color=POLAR, stroke_width=2, stroke_opacity=0.5), num_dashes=60)
        dot = always_redraw(lambda: Dot(ppt(), radius=0.13, color=INK).set_z_index(8))
        hleg = always_redraw(lambda: Line(O, foot(), color=CART, stroke_width=8).set_z_index(6))
        vleg = always_redraw(lambda: DashedLine(foot(), ppt(), color=CART, stroke_width=5, dash_length=0.1).set_z_index(6) if abs(ppt()[1] - foot()[1]) > 0.05 else VMobject())
        arc = always_redraw(lambda: Arc(radius=0.55, start_angle=0, angle=np.radians(ang.get_value()), arc_center=O, color=POLAR, stroke_width=5).set_z_index(6))
        ray = always_redraw(lambda: Line(O, ppt(), color=POLAR, stroke_width=3.5, stroke_opacity=0.8).set_z_index(5))
        th = always_redraw(lambda: tex(r"\theta", POLAR, 44).move_to(O + 0.9 * np.array([np.cos(np.radians(ang.get_value()) / 2), np.sin(np.radians(ang.get_value()) / 2), 0])).set_z_index(8))
        clab = tex(r"\cos\theta", CART, 40).add_updater(lambda m: m.move_to(O + (foot() - O) / 2 + DOWN * 0.4).set_z_index(8))
        slab = tex(r"\sin\theta", CART, 40).add_updater(lambda m: m.move_to(foot() + np.array([0.7 if foot()[0] >= O[0] else -0.7, (ppt()[1] - foot()[1]) / 2, 0])).set_z_index(8))
        title = self.card_title("Euler's formula", INK)
        f1 = self.card_line(MathTex(r"e^{i\theta}", r"=", r"\cos\theta+i\sin\theta", font_size=60), 0.1)
        f1[0].set_color(POLAR)
        f1[2].set_color(CART)
        f2 = self.card_line(MathTex(r"\theta=120^\circ:\ e^{i\theta}=-\tfrac12+\tfrac{\sqrt3}{2}\,i", font_size=40, color=INK), 1.3)
        f3 = self.card_line(MathTex(r"2\,e^{i\,120^\circ}=-1+i\sqrt{3}", font_size=48, color=INK), 2.4)
        badge = self.card_line(words("unit circle: length 1", POLAR, 30), 3.5)
        badge2 = self.card_line(words("stretch to length 2", POLAR, 30), 3.5)
        b.pop(FadeIn(self.panel), FadeIn(self.mask), FadeIn(grid), FadeIn(axes), FadeIn(self.axis_names), FadeIn(self.card), FadeIn(self.kicker),
              FadeOut(self.rule_stuff), FadeIn(circ), FadeIn(dot), FadeIn(hleg), FadeIn(vleg), FadeIn(arc), FadeIn(ray), FadeIn(th), FadeIn(clab), FadeIn(slab),
              FadeIn(title), FadeIn(f1), FadeIn(badge))
        b.go(0.1, 0.4, ang.animate.set_value(120.0), rate_func=smooth)                        # sweep theta from 40 to 120 degrees
        b.go(0.52, 0.04, FadeIn(f2))
        b.go(0.58, 0.2, rad.animate.set_value(2.0), FadeIn(circ2), FadeOut(badge), FadeIn(badge2))    # stretch to length 2
        b.go(0.8, 0.08, Write(f3))
        b.go(0.89, 0.07, Flash(dot, color=INK, flash_radius=0.5))
```

---

## Appendix B. `videos/scenes/staircase-roots.py` (validated reference implementation)

Rendered at `-ql` and `-qm` with manim Community v0.22.0; the stills of section 7.4 were taken from this file.

```python
"""Video 2, staircase-roots: one dot, many names for its angle. Station: staircase.

Narration: media/narration/videos/staircase-roots.json. Nine beats, one per segment, in the JSON's order.
The picture is one stage seen by a camera that can look straight down (the plane: only the dot) or from the
side (the staircase of names rises above the dot). Every beat opens on its own picture within half a second,
then re-enacts the construction on top of it. Colours come only from lib.palette: POLAR for names, angles and
roots, CART for Cartesian addresses, INK for the point, SEAM and WARN for the seam and the jump.
"""
import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, SEAM, WARN, OK

S3 = 3 ** 0.5
S2 = 2 ** 0.5
TAU = 2 * np.pi
RS = 2.3                                   # screen radius of the circle of interest (always the same size)
HT = 1.35                                  # screen height of one full turn, times the cosine of the elevation
PHI_TOP, PHI_TILT = 90.0, 38.0             # camera elevation in degrees: straight down / from the side
H0 = 1.0                                   # turns: the floor is the level of angle -360, so the steps -240, 120, 480 ... stand above the dot
POLE = (-0.2, 3.6)                         # the staircase pole, in turns above the floor
PANEL_C = np.array([-3.4, -0.1, 0.0])
PANEL_W, PANEL_H = 7.0, 7.2
CARD_X, CARD_W, CARD_H = 3.75, 6.4, 7.2
CY_TOP, CY_TILT = -0.2, -1.15              # screen y of the floor centre when looking down / from the side


def wrap_to(deg, lo):
    """The name of the same turn that lies in the window (lo, lo + 360]."""
    r = (deg - lo) % 360.0
    return lo + (360.0 if r < 1e-9 else r)


def hgt(deg):
    """Height, in turns above the floor, of the step named deg."""
    return deg / 360.0 + H0


def tex(s, color=INK, size=44, **kw):
    return MathTex(s, color=color, font_size=size, **kw)


def words(s, color=INK, size=32, weight=NORMAL):
    return Text(s, color=color, font_size=size, weight=weight)


class Shots:
    """Schedules the shots of one beat as fractions of the beat's length t (in seconds)."""

    def __init__(self, scene, t):
        self.s, self.t, self.t0 = scene, t, scene.renderer.time

    def elapsed(self):
        return self.s.renderer.time - self.t0

    def at(self, frac):
        """Idle until the beat is `frac` of the way through (never more than half a beat at once)."""
        gap = frac * self.t - self.elapsed()
        if gap > 0.1:
            self.s.wait(min(gap, 0.5 * self.t))

    def go(self, frac, length, *anims, **kw):
        """Start a shot at `frac` of the beat and let it last `length` of the beat."""
        assert 0 < length and frac + length <= 0.97, "a shot must end before the last 3% of its beat"
        self.at(frac)
        self.s.play(*anims, run_time=length * self.t, **kw)

    def pop(self, *anims):
        """The opening picture of the beat: on screen within 0.3 s."""
        self.s.play(*anims, run_time=min(0.3, 0.02 * self.t))


class Main(NarratedScene):
    narration_id = "staircase-roots"

    # ------------------------------------------------------------------ state and projection
    def init_state(self):
        self.phi = ValueTracker(PHI_TOP)       # camera elevation in degrees
        self.ang = ValueTracker(120.0)         # the dot's continuous angle in degrees (not wrapped)
        self.sig = ValueTracker(-180.0)        # the seam: the window of names is (sig, sig + 360]
        self.lw = 2.0                          # the length drawn at screen radius RS
        self.kspan = (-3, 3)                   # which steps of the staircase are drawn
        self.home_on = False                   # highlight the step inside the window
        self.last_jump = -10.0                 # scene time of the last jump of the home name
        self.vis = {k: ValueTracker(0.0) for k in ("floor", "seam", "stairs", "window", "dot", "arcs")}
        self.emph = [ValueTracker(0.0) for _ in range(3)]

    def v(self, name):
        return self.vis[name].get_value()

    def show(self, name, on=1.0):
        return self.vis[name].animate.set_value(on)

    def tilted(self):
        return self.phi.get_value() < 80

    def cy(self):
        return CY_TOP + (CY_TILT - CY_TOP) * (PHI_TOP - self.phi.get_value()) / (PHI_TOP - PHI_TILT)

    def proj(self, x, y, h=0.0):
        """Plane point (x, y), h turns above the floor, as a screen point. x and y are in the units of self.lw."""
        ph = np.radians(self.phi.get_value())
        k = RS / self.lw
        return np.array([PANEL_C[0] + k * x, self.cy() + k * y * np.sin(ph) + h * HT * np.cos(ph), 0.0])

    def fp(self, r, deg, h=0.0):
        """Point at radius r (units of lw) and angle deg on the floor, h turns up."""
        a = np.radians(deg)
        return self.proj(r * np.cos(a), r * np.sin(a), h)

    # ------------------------------------------------------------------ the always-redrawn stage
    # Every part reads the trackers each frame; fading a part means animating its entry of self.vis.
    def make_floor(self):
        def disk():
            pts = [self.fp(1.55 * self.lw, d) for d in np.linspace(0, 360, 73)]
            return Polygon(*pts, stroke_width=0, fill_color=MUTED, fill_opacity=0.07 * self.v("floor"))

        def axes():
            e = 1.55 * self.lw
            m = VGroup(Line(self.proj(-e, 0), self.proj(e, 0)), Line(self.proj(0, -e), self.proj(0, e)))
            return m.set_stroke(color=MUTED, width=2, opacity=0.75 * self.v("floor"))

        def circle():
            m = ParametricFunction(lambda a: self.fp(self.lw, np.degrees(a)), t_range=[0, TAU, 0.05])
            return m.set_stroke(color=POLAR, width=2.5, opacity=0.5 * self.v("floor"))

        def seam():
            m = DashedLine(self.proj(0, 0), self.fp(1.55 * self.lw, self.sig.get_value()), color=SEAM, stroke_width=5, dash_length=0.14)
            return m.set_stroke(opacity=self.v("seam"))

        seam_label = words("seam", SEAM, 32)
        seam_label.add_updater(lambda m: m.move_to(self.fp(0.55 * self.lw, self.sig.get_value()) + np.array([0, 0.3, 0])).set_opacity(self.v("seam")).set_z_index(8))
        return [always_redraw(f) for f in (disk, axes, circle, seam)] + [seam_label]

    def make_stairs(self):
        def pole():
            m = Line(self.proj(0, 0, POLE[0]), self.proj(0, 0, POLE[1]), color=MUTED, stroke_width=3)
            return m.set_stroke(opacity=0.8 * self.v("stairs") * (1 if self.tilted() else 0))

        def bars():
            a, lw, sg = self.ang.get_value(), self.lw, self.sig.get_value()
            vis = self.v("stairs")
            g = VGroup()
            for k in range(self.kspan[0], self.kspan[1] + 1):
                th = a + 360 * k                                   # the k-th name of the dot's angle
                h = hgt(th)
                base, tip = self.proj(0, 0, h), self.fp(lw, th, h)
                home = self.home_on and sg + 1e-6 < th <= sg + 360 + 1e-6
                g.add(Line(base, tip, color=POLAR, stroke_width=7 if home else 3, stroke_opacity=(1.0 if home else 0.5) * vis))
                g.add(Dot(tip, radius=0.17 if home else 0.09, color=POLAR).set_opacity((1.0 if home else 0.6) * vis))
                if home:
                    g.add(Circle(radius=0.29, color=INK, stroke_width=3.5).move_to(tip).set_stroke(opacity=vis))
            return g

        def helix():
            a = self.ang.get_value()
            lo, hi = a + 360 * (self.kspan[0] - 0.4), a + 360 * (self.kspan[1] + 0.4)
            m = ParametricFunction(lambda p: self.fp(self.lw, p, hgt(p)), t_range=[lo, hi, 4.0])
            return m.set_stroke(color=POLAR, width=2.5, opacity=0.3 * self.v("stairs"))

        def tether():
            a, lw = self.ang.get_value(), self.lw
            lo, hi = a + 360 * self.kspan[0], a + 360 * self.kspan[1]
            m = DashedLine(self.fp(lw, a, hgt(lo)), self.fp(lw, a, hgt(hi)), color=POLAR, stroke_width=2, dash_length=0.1)
            return m.set_stroke(opacity=0.5 * self.v("stairs"))

        return [always_redraw(f) for f in (helix, tether, pole, bars)]

    def make_window(self):
        def window():
            s = self.sig.get_value()
            vis = self.v("window") * (1 if self.tilted() else 0)
            p1, p2 = self.proj(0, 0, hgt(s)), self.proj(0, 0, hgt(s) + 1.0)
            fill = Rectangle(width=0.5, height=max(0.01, p2[1] - p1[1]), stroke_width=0, fill_color=POLAR, fill_opacity=0.28 * vis).move_to((p1 + p2) / 2)
            top = Line(p2 + LEFT * 0.4, p2 + RIGHT * 0.4, color=POLAR, stroke_width=5, stroke_opacity=vis)             # solid: included
            bot = DashedLine(p1 + LEFT * 0.4, p1 + RIGHT * 0.4, color=POLAR, stroke_width=5, dash_length=0.1).set_stroke(opacity=vis)   # dashed: left out
            return VGroup(fill, top, bot)

        def flash():
            age = self.renderer.time - self.last_jump
            s = self.sig.get_value()
            op = max(0.0, 1 - age / 0.9) * self.v("window")
            return VGroup(*[Circle(radius=0.3 + 0.7 * min(age, 0.9), color=WARN, stroke_width=4).move_to(self.proj(0, 0, hh)).set_stroke(opacity=op)
                            for hh in (hgt(s), hgt(s) + 1.0)]).set_z_index(9)

        return [always_redraw(window), always_redraw(flash)]

    def make_dot(self):
        def dot():
            return Dot(self.fp(self.lw, self.ang.get_value()), radius=0.14, color=INK).set_z_index(8).set_opacity(self.v("dot"))

        def zlab():
            m = tex("z", INK, 48).move_to(self.fp(self.lw, self.ang.get_value()) + np.array([-0.32, -0.4, 0]))
            return m.set_opacity(self.v("dot")).set_z_index(8)

        return [always_redraw(dot), always_redraw(zlab)]

    def floor_arc(self, r, start_deg, end_deg, idx=None, width=6, alpha=1.0, spiral=0.0, dashed=False, color=POLAR):
        """An arc on the floor from start_deg to end_deg (a spiral if the radius grows by `spiral` per turn); idx pulses it."""
        def f():
            n = max(8, int(abs(end_deg - start_deg) / 4))
            pts = [self.fp(r + spiral * (d - start_deg) / 360.0, d) for d in np.linspace(start_deg, end_deg, n)]
            m = VMobject().set_points_smoothly(pts)
            e = self.emph[idx].get_value() if idx is not None else 0.0
            m.set_stroke(color=color, width=width + 5 * e, opacity=alpha * self.v("arcs"))
            return DashedVMobject(m, num_dashes=26) if dashed else m
        return always_redraw(f)

    def floor_ray(self, deg, r=1.0, color=POLAR, width=6, alpha=1.0, dashed=False):
        def f():
            ln = (DashedLine if dashed else Line)(self.proj(0, 0), self.fp(r, deg), color=color, stroke_width=width)
            return ln.set_stroke(opacity=alpha * self.v("arcs"))
        return always_redraw(f)

    # ------------------------------------------------------------------ the card
    def card_title(self, text, color):
        m = words(text, color, 36, BOLD)
        if m.width > CARD_W - 0.8:
            m.scale_to_fit_width(CARD_W - 0.8)
        return m.move_to([CARD_X - CARD_W / 2 + 0.4, 3.0, 0], aligned_edge=LEFT).set_z_index(21)

    def card_line(self, mob, row):
        if mob.width > CARD_W - 0.8:
            mob.scale_to_fit_width(CARD_W - 0.8)
        mob.set_z_index(21)
        return mob.move_to([CARD_X - CARD_W / 2 + 0.4, 2.0 - 1.0 * row, 0], aligned_edge=LEFT)

    def dial(self, deg, center):
        """A small circle with one radius at angle deg: the direction a number points."""
        c = Circle(radius=0.3, color=POLAR, stroke_width=2.5, stroke_opacity=0.6).move_to(center)
        ln = Line(center, center + 0.3 * np.array([np.cos(np.radians(deg)), np.sin(np.radians(deg)), 0]), color=POLAR, stroke_width=6)
        return VGroup(c, ln, Dot(center, radius=0.04, color=POLAR)).set_z_index(21)

    def pulse(self, point=None, radius=0.55):
        p = self.fp(self.lw, self.ang.get_value()) if point is None else point
        return Flash(p, color=INK, flash_radius=radius, line_length=0.18)

    # ------------------------------------------------------------------ the film
    def construct(self):
        self.camera.background_color = BG
        self.init_state()
        panel = Rectangle(width=PANEL_W, height=PANEL_H, fill_color=SURFACE, fill_opacity=0.6, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to(PANEL_C)
        hole = Rectangle(width=PANEL_W, height=PANEL_H).move_to(PANEL_C)
        mask = Cutout(Rectangle(width=16, height=9), hole, fill_color=BG, fill_opacity=1, stroke_width=0).set_z_index(10)
        card = RoundedRectangle(corner_radius=0.2, width=CARD_W, height=CARD_H, fill_color=SURFACE, fill_opacity=1, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to([CARD_X, PANEL_C[1], 0]).set_z_index(20)
        self.add(panel, mask, card, *self.make_floor(), *self.make_stairs(), *self.make_window(), *self.make_dot())
        with self.beat("intro") as t:
            self.intro(t)
        with self.beat("names") as t:
            self.names(t)
        with self.beat("set") as t:
            self.set_beat(t)
        with self.beat("home") as t:
            self.home(t)
        with self.beat("jump") as t:
            self.jump(t)
        with self.beat("power") as t:
            self.power(t)
        with self.beat("roots") as t:
            self.roots(t)
        with self.beat("principal") as t:
            self.principal(t)
        with self.beat("branch") as t:
            self.branch(t)

    # ------------------------------------------------------------------ beats
    def intro(self, t):
        b = Shots(self, t)
        title = self.card_title("One dot", INK)
        cart = self.card_line(tex(r"\text{Cartesian: }(-1,\ \sqrt{3})", CART, 44), 0)
        pol = self.card_line(tex(r"\text{polar: length }2,\ \text{angle }?", POLAR, 44), 1.2)
        names = self.card_line(tex(r"120^\circ,\ 480^\circ,\ -240^\circ,\ \dots", POLAR, 48), 2.3)
        use = self.card_line(words("roots, branches, half the test", MUTED, 30), 3.6)
        ray = self.floor_ray(120.0, 2.0)
        a1 = self.floor_arc(0.7, 0, 120)
        a2 = self.floor_arc(0.95, 0, 480, alpha=0.6, spiral=0.35)
        lab = tex(r"120^\circ", POLAR, 44).move_to(self.fp(1.1, 55))
        q = tex(r"?", WARN, 60).move_to(self.fp(1.5, 160))
        self.add(ray, a1, a2)
        b.pop(self.show("floor"), self.show("dot"), FadeIn(title), FadeIn(cart))
        b.go(0.12, 0.1, self.show("arcs"), FadeIn(lab))
        b.go(0.3, 0.12, FadeIn(pol))
        b.go(0.5, 0.18, FadeIn(q), FadeIn(names))
        b.go(0.78, 0.12, FadeIn(use))
        self.intro_stuff = VGroup(title, cart, pol, names, use, lab, q)
        self.intro_arcs = (ray, a1, a2)

    def names(self, t):
        b = Shots(self, t)
        for m in self.intro_arcs:
            self.remove(m)
        title = self.card_title("Three names, one dot", POLAR)
        r1 = self.card_line(tex(r"\theta=120^\circ", POLAR, 48), 0)
        r2 = self.card_line(tex(r"\theta=480^\circ=120^\circ+360^\circ", POLAR, 44), 1.1)
        r3 = self.card_line(tex(r"\theta=-240^\circ=120^\circ-360^\circ", POLAR, 44), 2.2)
        same = self.card_line(words("the same dot every time", INK, 32), 3.4)
        ray = self.floor_ray(120.0, 2.0)
        a1 = self.floor_arc(0.55, 0, 120, idx=0)                                       # 120: solid
        a2 = self.floor_arc(1.0, 0, 480, idx=1, spiral=0.3, alpha=0.9)                 # 480: a lap and a third, as a spiral
        a3 = self.floor_arc(0.78, 0, -240, idx=2, dashed=True, alpha=0.95)             # -240: clockwise, dashed
        self.add(ray, a1, a2, a3)
        b.pop(FadeOut(self.intro_stuff), FadeIn(title), FadeIn(r1), FadeIn(r2), FadeIn(r3))
        for i, (frac, row) in enumerate(((0.08, r1), (0.30, r2), (0.55, r3))):         # the arc and its row pulse as the voice names it
            b.go(frac, 0.1, self.emph[i].animate.set_value(1.0), Indicate(row, color=INK, scale_factor=1.05))
            b.go(frac + 0.12, 0.06, self.emph[i].animate.set_value(0.0))
        b.go(0.78, 0.1, FadeIn(same), self.pulse())
        self.kspan = (-2, 2)
        b.go(0.88, 0.09, self.phi.animate.set_value(PHI_TILT), self.show("stairs"), FadeOut(r1), FadeOut(r2), FadeOut(r3), FadeOut(same))   # the camera lowers
        self.names_stuff = VGroup(title)
        self.names_arcs = (ray, a1, a2, a3)

    def set_beat(self, t):
        b = Shots(self, t)
        for m in self.names_arcs:
            self.remove(m)
        self.vis["arcs"].set_value(0.0)
        title = self.card_title("arg z: the whole set", POLAR)
        s1 = self.card_line(tex(r"\arg z=\{\,120^\circ+360^\circ k\,\}", POLAR, 48), 0)
        s2 = self.card_line(tex(r"k=\dots,-2,-1,0,1,2,\dots", POLAR, 42), 1.1)
        s3 = self.card_line(words("one step for every full turn", POLAR, 32), 2.2)
        s4 = self.card_line(words("the dot stays on the floor", INK, 32), 3.2)
        labels = VGroup()
        for k in range(-1, 2):                                                          # the labelled steps: -240, 120, 480
            th = 120 + 360 * k
            lb = tex(f"{th}^\\circ", POLAR, 42)
            lb.move_to(self.fp(self.lw, th, hgt(th)) + np.array([-0.9, 0.0, 0]))
            labels.add(lb)
        b.pop(FadeOut(self.names_stuff), FadeIn(title), FadeIn(s1), FadeIn(labels))
        b.go(0.15, 0.2, FadeIn(s2), LaggedStart(*[Indicate(m, color=INK, scale_factor=1.2) for m in labels], lag_ratio=0.5))
        b.go(0.55, 0.12, FadeIn(s3))
        b.go(0.7, 0.12, FadeIn(s4), self.pulse())
        self.set_stuff = VGroup(title, s1, s2, s3, s4)
        self.set_labels = labels

    def home(self, t):
        b = Shots(self, t)
        title = self.card_title("Arg z: the home step", POLAR)
        h1 = self.card_line(MathTex(r"\operatorname{Arg} z\in(-180^\circ,\,180^\circ]", font_size=46, color=POLAR), 0)
        h2 = self.card_line(MathTex(r"\operatorname{Arg} z=120^\circ", font_size=52, color=POLAR), 1.1)
        h3 = self.card_line(MathTex(r"\operatorname{Arg} z", r"\text{ is one number}", font_size=42), 2.2)
        h4 = self.card_line(MathTex(r"\arg z", r"\text{ is all of them}", font_size=42), 3.1)
        h5 = self.card_line(words("z: the place they all point to", INK, 32), 4.0)
        for m in (h3, h4):
            m[0].set_color(POLAR)
            m[1].set_color(INK)
        top = tex(r"180^\circ\ ]", POLAR, 40).move_to(self.proj(0, 0, hgt(180)) + np.array([1.1, 0.0, 0]))
        bot = tex(r"-180^\circ\ (", POLAR, 40).move_to(self.proj(0, 0, hgt(-180)) + np.array([1.25, 0.0, 0]))
        keep = self.set_labels[1]                                                       # the 120 label stays; the others go
        others = VGroup(self.set_labels[0], self.set_labels[2])
        self.home_on = True
        b.pop(FadeOut(self.set_stuff), FadeOut(others), self.show("window"), self.show("seam"), FadeIn(title), FadeIn(h1), FadeIn(top), FadeIn(bot))
        b.go(0.3, 0.12, FadeIn(h2), Indicate(keep, color=INK))
        b.go(0.52, 0.1, FadeIn(h3))
        b.go(0.64, 0.1, FadeIn(h4))
        b.go(0.78, 0.12, FadeIn(h5), self.pulse())
        self.home_stuff = VGroup(title, h1, h2, h3, h4, h5, top, bot, keep)

    def jump(self, t):
        b = Shots(self, t)
        title = self.card_title("The home step jumps", POLAR)
        lab1 = MathTex(r"\text{name that keeps climbing}", font_size=36, color=POLAR)
        n1 = DecimalNumber(120, num_decimal_places=0, unit=r"^\circ", font_size=58, color=POLAR)
        lab2 = MathTex(r"\operatorname{Arg} z\ (\text{the home name})", font_size=36, color=INK)
        n2 = DecimalNumber(120, num_decimal_places=0, unit=r"^\circ", font_size=58, color=INK)
        g1 = VGroup(lab1, n1).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        g2 = VGroup(lab2, n2).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        VGroup(g1, g2).arrange(DOWN, aligned_edge=LEFT, buff=0.7).move_to([CARD_X - CARD_W / 2 + 0.4, 0.9, 0], aligned_edge=LEFT)
        for g in (g1, g2):
            g.set_z_index(21)
        # a DecimalNumber builds new digits on every update, so each update puts them back above the card
        n1.add_updater(lambda m: m.set_value(round(self.ang.get_value())).set_z_index(21))
        n2.add_updater(lambda m: m.set_value(round(wrap_to(self.ang.get_value(), -180.0))).set_z_index(21))
        note = self.card_line(words("a name that keeps climbing cannot stay home", MUTED, 30), 4.6)
        self._prev = wrap_to(self.ang.get_value(), -180.0)

        def watch(_):                                                                   # a jump of the home name triggers the red ring
            cur = wrap_to(self.ang.get_value(), -180.0)
            if abs(cur - self._prev) > 180:
                self.last_jump = self.renderer.time
            self._prev = cur
        w = Mobject()
        w.add_updater(watch)
        self.add(w)
        b.pop(FadeOut(self.home_stuff), FadeIn(title), FadeIn(g1), FadeIn(g2))
        b.go(0.0, 0.10, self.ang.animate.set_value(200.0), rate_func=linear)           # across the seam once, early
        b.go(0.15, 0.1, self.ang.animate.set_value(165.0), rate_func=linear)           # and back
        b.go(0.27, 0.1, self.ang.animate.set_value(200.0), rate_func=linear)           # and across again, slowly
        b.go(0.4, 0.4, self.ang.animate.set_value(560.0), rate_func=linear)            # then one whole lap: one jump
        b.go(0.82, 0.05, FadeIn(note))
        self.remove(w)
        n1.clear_updaters()
        n2.clear_updaters()
        self.jump_stuff = VGroup(title, g1, g2, note)

    def power(self, t):
        b = Shots(self, t)
        self.ang.set_value(30.0)                                                        # cut to the test's own number: root three plus i = 2 e^{i 30 deg}
        self.kspan = (-2, 2)
        self.home_on = False
        self.vis["window"].set_value(0.0)
        self.vis["seam"].set_value(0.0)
        title = self.card_title("Powers ignore the name", POLAR)
        r0 = self.card_line(MathTex(r"z=", r"\sqrt{3}+i", r"=", r"2\,e^{i\,30^\circ}", font_size=46), 0)
        r0[1].set_color(CART)
        r0[3].set_color(POLAR)
        x0 = CARD_X - CARD_W / 2 + 0.75
        rows = []
        for txt, row in ((r"30^\circ\cdot 10=300^\circ", 1.15), (r"390^\circ\cdot 10=3900^\circ=300^\circ+3600^\circ", 2.15), (r"-330^\circ\cdot 10=-3300^\circ=300^\circ-3600^\circ", 3.15)):
            m = tex(txt, POLAR, 38)
            m.scale_to_fit_width(min(m.width, CARD_W - 1.9))
            m.set_z_index(21).move_to([x0 + 0.65, 2.0 - row, 0], aligned_edge=LEFT)
            rows.append((m, self.dial(300, np.array([x0, 2.0 - row, 0.0]))))           # all three dials point the same way: 300 degrees
        res1 = self.card_line(MathTex(r"z^{10}=1024\,e^{-i\,60^\circ}", font_size=46, color=POLAR), 4.3)
        res2 = self.card_line(MathTex(r"=512-512\sqrt{3}\,i", font_size=46, color=CART), 5.2)
        labels = VGroup()
        for k in (-1, 0, 1):
            th = 30 + 360 * k
            lb = tex(f"{th}^\\circ", POLAR, 42)
            lb.move_to(self.fp(self.lw, th, hgt(th)) + np.array([0.95, 0.0, 0]))
            labels.add(lb)
        ray = self.floor_ray(-60.0, 1.45, dashed=True, width=5)
        arc = self.floor_arc(0.45, 0, -60, width=5)
        lray = tex(r"z^{10}:\ \text{length }1024", POLAR, 36).move_to(self.fp(1.0, -60) + np.array([0.0, -0.75, 0]))
        lang = tex(r"-60^\circ", POLAR, 38).move_to(self.fp(0.75, -22))
        self.add(ray, arc)
        b.pop(FadeOut(self.jump_stuff), FadeIn(title), FadeIn(r0), FadeIn(labels))
        b.go(0.14, 0.12, FadeIn(rows[0][0]), FadeIn(rows[0][1]), self.pulse())
        b.go(0.40, 0.12, FadeIn(rows[1][0]), FadeIn(rows[1][1]))
        b.go(0.54, 0.12, FadeIn(rows[2][0]), FadeIn(rows[2][1]))
        b.go(0.7, 0.12, self.show("arcs"), FadeIn(lray), FadeIn(lang), FadeIn(res1))
        b.go(0.84, 0.06, FadeIn(res2))
        b.go(0.9, 0.07, self.phi.animate.set_value(PHI_TOP), self.show("stairs", 0.0), self.show("dot", 0.0), self.show("arcs", 0.0),
             FadeOut(labels), FadeOut(lray), FadeOut(lang))                              # the camera rises to look straight down
        self.remove(ray, arc)
        self.power_stuff = VGroup(title, r0, res1, res2, *[m for pair in rows for m in pair])

    def roots(self, t):
        b = Shots(self, t)
        self.lw = 1.0                                                                   # the unit circle is drawn at the usual size
        deg5 = [72 * k for k in range(5)]
        O = self.proj(0, 0)
        title = self.card_title("Roots need every name", POLAR)
        n0 = self.card_line(tex(r"\arg 1=\{0^\circ,\,360^\circ,\,720^\circ,\dots\}", POLAR, 42), 0)
        n1 = self.card_line(tex(r"\div 5:\ 0,\ 72,\ 144,\ 216,\ 288\ (^\circ)", POLAR, 42), 1.1)
        n2 = self.card_line(tex(r"\text{step }5:\ 360^\circ=0^\circ\ \text{again}", POLAR, 42), 2.2)
        n3 = self.card_line(tex(r"\sqrt[4]{-16}:\ 2\,e^{i(45^\circ+90^\circ k)}", POLAR, 42), 3.6)
        n4 = self.card_line(tex(r"=\pm\sqrt{2}\pm\sqrt{2}\,i", CART, 42), 4.6)
        dots = VGroup(*[Dot(self.fp(1.0, d), radius=0.14, color=INK).set_z_index(8) for d in deg5])
        rays = VGroup(*[Line(O, self.fp(1.0, d), color=POLAR, stroke_width=3, stroke_opacity=0.55) for d in deg5])
        pent = Polygon(*[self.fp(1.0, d) for d in deg5], color=POLAR, stroke_width=2, stroke_opacity=0.4, fill_opacity=0)
        arcs = VGroup(*[Arc(radius=0.62 if i % 2 == 0 else 0.84, start_angle=np.radians(d), angle=np.radians(72), arc_center=O, color=POLAR, stroke_width=4)
                        for i, d in enumerate(deg5)])
        a72 = VGroup(*[tex(r"72^\circ", POLAR, 32).move_to(self.fp(0.5, d + 36)) for d in deg5])
        names = VGroup(*[tex(f"{d}^\\circ", POLAR, 40).move_to(self.fp(1.0, d) + 0.68 * np.array([np.cos(np.radians(d)), np.sin(np.radians(d)), 0])) for d in deg5])
        wrap = CurvedArrow(self.fp(1.0, 288) + np.array([0.45, -0.25, 0]), self.fp(1.0, 360) + np.array([0.5, -0.35, 0]),
                           angle=-TAU / 6, color=OK, stroke_width=4, tip_length=0.22).set_z_index(9)
        self.lw = 2.0                                                                   # the four roots of -16 have length 2: same circle, new label
        four_d = [45, 135, 225, 315]
        four = VGroup(*[Dot(self.fp(2.0, d), radius=0.14, color=INK).set_z_index(8) for d in four_d],
                      *[Line(O, self.fp(2.0, d), color=POLAR, stroke_width=3, stroke_opacity=0.55) for d in four_d],
                      *[tex(f"{d}^\\circ", POLAR, 40).move_to(self.fp(2.0, d) + 0.68 * np.array([np.cos(np.radians(d)), np.sin(np.radians(d)), 0])) for d in four_d],
                      tex(r"\text{length }2", POLAR, 40).move_to(self.fp(2.0, 90) + np.array([1.05, 0.15, 0])))
        self.lw = 1.0
        b.pop(FadeOut(self.power_stuff), FadeIn(title), FadeIn(n0), FadeIn(a72), FadeIn(rays), FadeIn(dots), FadeIn(pent), FadeIn(arcs), self.show("floor"))
        b.go(0.07, 0.2, LaggedStart(*[Indicate(m, color=INK, scale_factor=1.6) for m in dots], lag_ratio=0.3))
        b.go(0.34, 0.16, FadeIn(n1), LaggedStart(*[FadeIn(m) for m in names], lag_ratio=0.35))
        b.go(0.54, 0.16, FadeIn(n2), Create(wrap))
        b.go(0.74, 0.08, FadeOut(dots), FadeOut(rays), FadeOut(pent), FadeOut(arcs), FadeOut(a72), FadeOut(names), FadeOut(wrap))
        self.lw = 2.0
        b.go(0.82, 0.12, FadeIn(four), FadeIn(n3), FadeIn(n4))
        self.roots_stuff = VGroup(title, n0, n1, n2, n3, n4, four)

    def principal(self, t):
        b = Shots(self, t)
        self.lw = 2.0
        O = self.proj(0, 0)
        title = self.card_title("The principal root", POLAR)
        p0 = self.card_line(MathTex(r"w=2i:\ |w|=2,\ \operatorname{Arg} w=90^\circ", font_size=42, color=POLAR), 0)
        p1 = self.card_line(MathTex(r"\sqrt{2}\ \text{at}\ 90^\circ/2=45^\circ", font_size=46, color=POLAR), 1.2)
        p2 = self.card_line(MathTex(r"\sqrt{2}\,e^{i\,45^\circ}=1+i", font_size=48, color=INK), 2.3)
        p3 = self.card_line(MathTex(r"\sqrt{2}\,e^{i\,225^\circ}=-1-i", font_size=44, color=INK), 3.6)
        p4 = self.card_line(words("225 degrees is (90 + 360) / 2", MUTED, 30), 4.5)
        w = Dot(self.fp(2.0, 90), radius=0.14, color=INK).set_z_index(8)
        wl = tex(r"w=2i", CART, 46).move_to(self.fp(2.0, 90) + np.array([0.9, 0.2, 0]))
        wray = Line(O, self.fp(2.0, 90), color=POLAR, stroke_width=4, stroke_opacity=0.7)
        warc = Arc(radius=0.95, start_angle=0, angle=np.radians(90), arc_center=O, color=POLAR, stroke_width=5)
        ring = DashedVMobject(Circle(radius=RS * S2 / 2, arc_center=O, color=POLAR, stroke_width=2.5, stroke_opacity=0.6), num_dashes=40)
        pr, gr = self.fp(S2, 45), self.fp(S2, 225)
        prin = Dot(pr, radius=0.18, color=INK).set_z_index(8)                           # the principal root: emphasised
        prin_ring = Circle(radius=0.3, color=POLAR, stroke_width=4).move_to(pr).set_z_index(8)
        prin_l = VGroup(tex(r"1+i", CART, 46), tex(r"\sqrt{2}\ \text{at}\ 45^\circ", POLAR, 30)).arrange(DOWN, buff=0.08).move_to(pr + np.array([1.3, 0.62, 0]))
        ghost = Dot(gr, radius=0.14, color=INK).set_opacity(0.4).set_z_index(8)         # the other root: ghosted
        ghost_l = tex(r"-1-i", CART, 42).set_opacity(0.55).move_to(gr + np.array([-0.9, -0.2, 0]))
        harc = Arc(radius=0.65, start_angle=0, angle=np.radians(45), arc_center=O, color=INK, stroke_width=5)
        garc = DashedVMobject(Arc(radius=0.45, start_angle=0, angle=np.radians(225), arc_center=O, color=POLAR, stroke_width=4, stroke_opacity=0.6), num_dashes=22)
        tp = ValueTracker(0.0)                                                          # w travels to the root: length 2 to root two, angle 90 to 45
        tracer = always_redraw(lambda: Dot(self.fp(2.0 + (S2 - 2.0) * tp.get_value(), 90 - 45 * tp.get_value()), radius=0.11, color=INK).set_stroke(INK, 3).set_z_index(9))
        b.pop(FadeOut(self.roots_stuff), FadeIn(title), FadeIn(p0), FadeIn(w), FadeIn(wl), FadeIn(wray), FadeIn(warc), FadeIn(ring),
              FadeIn(prin), FadeIn(prin_ring), FadeIn(prin_l), FadeIn(ghost), FadeIn(ghost_l), FadeIn(harc))
        self.add(tracer)
        b.go(0.2, 0.28, tp.animate.set_value(1.0), rate_func=smooth)
        b.go(0.5, 0.1, FadeIn(p1), self.pulse(pr))
        b.go(0.6, 0.1, FadeIn(p2))
        b.go(0.72, 0.1, FadeIn(garc), FadeIn(p3))
        b.go(0.85, 0.04, FadeIn(p4))
        self.remove(tracer)
        pmap = VGroup(w, wl, wray, warc, ring, prin, prin_ring, prin_l, ghost, ghost_l, harc, garc)
        self.lw, self.kspan, self.home_on = 1.0, (-3, 3), True                          # set up the branch: the test point is -1, length 1
        self.ang.set_value(165.0)
        self.sig.set_value(-180.0)
        b.go(0.89, 0.08, FadeOut(pmap), self.phi.animate.set_value(PHI_TILT), self.show("stairs"), self.show("dot"), self.show("window"), self.show("seam"))
        self.principal_stuff = VGroup(title, p0, p1, p2, p3, p4)

    def branch(self, t):
        b = Shots(self, t)
        self.vis["arcs"].set_value(0.0)
        title = self.card_title("Branch of the cube root", POLAR)
        lab1 = MathTex(r"\text{name in the window}", font_size=36, color=POLAR)
        n1 = DecimalNumber(165, num_decimal_places=0, unit=r"^\circ", font_size=56, color=POLAR)
        lab2 = MathTex(r"\text{cube root: angle}\ \div 3", font_size=36, color=INK)
        n2 = DecimalNumber(55, num_decimal_places=0, unit=r"^\circ", font_size=56, color=INK)
        g1 = VGroup(lab1, n1).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        g2 = VGroup(lab2, n2).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        VGroup(g1, g2).arrange(DOWN, aligned_edge=LEFT, buff=0.6).move_to([CARD_X - CARD_W / 2 + 0.4, 1.4, 0], aligned_edge=LEFT)
        for g in (g1, g2):
            g.set_z_index(21)

        def name():                                                                     # the name the branch uses: the one in (sig, sig + 360]
            return wrap_to(self.ang.get_value(), self.sig.get_value())
        n1.add_updater(lambda m: m.set_value(round(name())).set_z_index(21))
        n2.add_updater(lambda m: m.set_value(round(name() / 3.0)).set_z_index(21))
        wtop = DecimalNumber(180, num_decimal_places=0, unit=r"^\circ", font_size=40, color=POLAR)
        wbot = DecimalNumber(-180, num_decimal_places=0, unit=r"^\circ", font_size=40, color=POLAR)
        wtop.add_updater(lambda m: m.set_value(round(self.sig.get_value() + 360)).move_to(self.proj(0, 0, hgt(self.sig.get_value()) + 1) + np.array([1.9, 0.0, 0]), aligned_edge=LEFT).set_z_index(9))
        wbot.add_updater(lambda m: m.set_value(round(self.sig.get_value())).move_to(self.proj(0, 0, hgt(self.sig.get_value())) + np.array([1.9, 0.0, 0]), aligned_edge=LEFT).set_z_index(9))
        fin = self.card_line(MathTex(r"(-1)^{1/3}=e^{i\,60^\circ}=\tfrac12+\tfrac{\sqrt{3}}{2}\,i", font_size=42, color=INK), 3.9)
        fin2 = self.card_line(words("seam on the positive real axis: continuous at -1", MUTED, 28), 4.9)

        def root_mark():                                                                # the cube root: angle = name / 3, on the same circle
            p, vv = self.fp(self.lw, name() / 3.0), self.v("arcs")
            ring = Circle(radius=0.26, color=INK, stroke_width=3.5, fill_opacity=0).move_to(p).set_stroke(opacity=vv)
            return VGroup(Dot(p, radius=0.13, color=POLAR).set_opacity(vv), ring).set_z_index(8)
        root = always_redraw(root_mark)
        self._prev = name()

        def watch(_):
            cur = name()
            if abs(cur - self._prev) > 180:
                self.last_jump = self.renderer.time
            self._prev = cur
        w = Mobject()
        w.add_updater(watch)
        self.add(w, root, wtop, wbot)
        b.pop(FadeOut(self.principal_stuff), FadeIn(title), FadeIn(g1), FadeIn(g2), self.show("arcs"))
        b.go(0.0, 0.12, self.sig.animate.set_value(-90.0), rate_func=smooth)           # the seam moves at once: down to the negative imaginary axis
        b.go(0.13, 0.1, self.sig.animate.set_value(-180.0), rate_func=smooth)          # and back to the negative real axis
        b.go(0.25, 0.1, self.ang.animate.set_value(195.0), rate_func=linear)           # the dot crosses the principal seam: the name jumps
        b.go(0.36, 0.07, self.ang.animate.set_value(165.0), rate_func=linear)
        b.go(0.43, 0.21, self.sig.animate.set_value(0.0), rate_func=smooth)            # slide the seam to the positive real axis: the window climbs the pole
        b.go(0.65, 0.09, self.ang.animate.set_value(195.0), rate_func=linear)          # the same crossing is now continuous
        b.go(0.75, 0.05, self.ang.animate.set_value(180.0), rate_func=linear)          # park on -1
        b.go(0.80, 0.1, FadeIn(fin), FadeIn(fin2))
        self.remove(w)
        for m in (n1, n2, wtop, wbot):
            m.clear_updaters()
```

---

## Appendix C. `tests/unit/i2-videos-ch1.test.mjs` (validated)

Passes 11 of 11 against the prototype and fails the 12 mutations of section 7.2.

```js
// tests/unit/i2-videos-ch1.test.mjs
// Goal i2-videos-ch1: the two Chapter 1 manim scenes (videos/scenes/two-addresses.py, videos/scenes/staircase-roots.py) and their
// narration (media/narration/videos/*.json). Acceptance criteria A2 and A4 in full, the file half of A1, and every number the two
// videos speak or show (docs/designs/iter-2/i2-videos-ch1.md section 6). Nothing here needs manim: the scenes are read as text.
// Run: node --test tests/unit/i2-videos-ch1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STATIONS } from '../../js/registry.js';
import * as Cx from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const { C } = Cx;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearC = (z, w, eps = 1e-9, msg = '') => {
  w = typeof w === 'number' ? C(w, 0) : w;
  assert.ok(Math.hypot(z.re - w.re, z.im - w.im) <= eps, `${msg} expected (${w.re}, ${w.im}), got (${z.re}, ${z.im}) (eps ${eps})`);
};
const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;
const S2 = Math.SQRT2;
const S3 = Math.sqrt(3);

const VIDEOS = {
  'two-addresses': { station: 'addresses', hosts: ['home', 'addresses'], segments: ['intro', 'cart', 'polar', 'same', 'add', 'mul', 'rule', 'euler'] },
  'staircase-roots': { station: 'staircase', hosts: ['staircase'], segments: ['intro', 'names', 'set', 'home', 'jump', 'power', 'roots', 'principal', 'branch'] },
};
const IDS = Object.keys(VIDEOS);
const narration = (id) => JSON.parse(read(`media/narration/videos/${id}.json`));
const scene = (id) => read(`videos/scenes/${id}.py`);
const words = (t) => t.trim().split(/\s+/).length;
const allText = (id) => narration(id).segments.map((s) => s.text).join(' ');
const beatIds = (py) => [...py.matchAll(/self\.beat\(\s*(["'])([^"']+)\1\s*\)/g)].map((m) => m[2]);
// Python source with comments and docstrings removed, for the rules about code (a comment may mention a rule it follows).
const code = (py) => py.replace(/"""[\s\S]*?"""/g, '').split('\n').map((l) => l.replace(/\s#.*$/, '').replace(/^\s*#.*$/, '')).join('\n');
const paletteNames = () => [...read('videos/lib/palette.py').matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*"#[0-9a-fA-F]{6}"/gm)].map((m) => m[1]);
const hasPython = spawnSync('python3', ['--version']).status === 0;

// ---------- U1: beats and segments agree (A2) ----------
test('U1 the beats of each scene are the segments of its narration, once each, in order (A2)', () => {
  for (const id of IDS) {
    const ids = beatIds(scene(id));
    const segs = narration(id).segments.map((s) => s.id);
    assert.deepEqual(segs, VIDEOS[id].segments, `${id}: segment ids`);
    assert.deepEqual(ids, segs, `${id}: self.beat ids in the order of first appearance equal the segment ids`);
    assert.equal(new Set(ids).size, ids.length, `${id}: every beat appears exactly once`);
  }
});

// ---------- U2: the JSON files (A2) ----------
test('U2 narration JSON: id, title, summary, station, music, segments (A2)', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.equal(n.id, id, `${id}: id`);
    assert.ok(typeof n.title === 'string' && n.title.length > 0 && n.title.length <= 60, `${id}: title`);
    assert.ok(typeof n.summary === 'string' && n.summary.length >= 40, `${id}: summary has at least 40 characters`);
    assert.equal(n.station, VIDEOS[id].station, `${id}: station`);
    const hosts = STATIONS.filter((s) => s.video === id).map((s) => s.id);
    assert.deepEqual(hosts, VIDEOS[id].hosts, `${id}: the registry stations whose video field is the id`);
    assert.ok(hosts.includes(n.station), `${id}: the JSON station is one of the stations that list the video`);
    assert.ok(n.music && typeof n.music.prompt === 'string' && n.music.prompt.length >= 20, `${id}: music.prompt has at least 20 characters`);
    assert.ok(Number.isFinite(n.music.seconds) && n.music.seconds >= 20 && n.music.seconds <= 40, `${id}: music.seconds is 20 to 40`);
    assert.deepEqual(Object.keys(n).sort(), ['id', 'music', 'segments', 'station', 'summary', 'title'], `${id}: no other top-level keys`);
    assert.equal(n.segments.length, VIDEOS[id].segments.length, `${id}: segment count`);
    for (const s of n.segments) assert.deepEqual(Object.keys(s).sort(), ['id', 'text'], `${id}/${s.id}: keys`);
  }
});

// ---------- U3: lengths (A2, and the 120 to 180 s of A1 before anything is rendered) ----------
test('U3 word counts: 300 to 450 per video, 12 to 60 per segment, and a silent length of 120 to 180 s (A2, A1)', () => {
  for (const id of IDS) {
    const segs = narration(id).segments;
    let total = 0;
    let seconds = 0;
    for (const s of segs) {
      const w = words(s.text);
      const letters = (s.text.match(/[A-Za-z0-9']+/g) || []).length;
      assert.ok(w >= 12 && w <= 60 && letters >= 12 && letters <= 60, `${id}/${s.id}: ${w} words (${letters} by letters), need 12 to 60`);
      total += w;
      seconds += Math.max(1.5, w / 2.5) + 0.35;                   // videos/lib/narrated.py: WORDS_PER_SECOND, MIN_BEAT_SECONDS, PAD_SECONDS
    }
    assert.ok(total >= 300 && total <= 450, `${id}: ${total} words in all`);
    assert.ok(seconds >= 125 && seconds <= 175, `${id}: the silent length estimate is ${seconds.toFixed(1)} s`);
  }
});

// ---------- U4: written for the ear, with the pins of A2 ----------
test('U4 the narration pins of A2 and the ear rules', () => {
  const v1 = allText('two-addresses');
  assert.ok(/minus one plus i root three|minus 1 plus i root 3/.test(v1), 'the dot is named: minus one plus i root three');
  assert.ok(v1.includes('Cartesian') && v1.includes('polar'), 'both addresses are named');
  assert.ok(v1.includes('120 degrees') && v1.includes('length 2'), '120 degrees and length 2');
  assert.ok(v1.includes('45 degrees') && v1.includes('165 degrees'), 'the multiplication example: 45 and 165 degrees');
  const v2 = allText('staircase-roots');
  assert.ok(/\barg z\b/.test(v2) && /\bArg z\b/.test(v2), 'arg z and Arg z both appear, spelled exactly so');
  assert.ok(v2.includes('72 degrees'), '72 degrees');
  assert.ok(v2.includes('Capital Arg z') && v2.includes('Little arg z'), 'the words around the two spellings carry the difference');
  for (const id of IDS) for (const s of narration(id).segments) {
    assert.ok(!/[=^_{}<>+*/\\$#~|]/.test(s.text), `${id}/${s.id}: no symbols, say the words`);
    assert.ok(/^[\x20-\x7e]+$/.test(s.text), `${id}/${s.id}: printable ASCII only`);
    assert.ok(s.text === s.text.trim() && !/\s\s/.test(s.text) && /[.?]$/.test(s.text), `${id}/${s.id}: trimmed, single spaces, ends with a full stop`);
    assert.ok(!/\d[A-Za-z]|[A-Za-z]\d/.test(s.text), `${id}/${s.id}: a numeral is a word of its own`);
  }
});

// ---------- U5: palette and structure (A2) ----------
test('U5 both scenes import their colours from lib.palette and define class Main(NarratedScene) (A2)', () => {
  const names = paletteNames();
  assert.equal(names.length, 13, 'palette.py defines the 13 dark tokens');
  for (const id of IDS) {
    const py = scene(id);
    assert.ok(!/#[0-9a-fA-F]{6}/.test(py), `${id}.py has no literal hex colour`);
    assert.ok(!/(?:rgb|rgba|hsl)\s*\(|ManimColor|color\s*=\s*["']/.test(code(py)), `${id}.py has no colour literal of another kind`);
    assert.ok(!/\b(WHITE|BLACK|RED|BLUE|GREEN|YELLOW|ORANGE|PURPLE|PINK|TEAL|GOLD|GRAY|GREY|MAROON|DARK_BLUE|LIGHT_GRAY|PURE_\w+)\b/.test(code(py)), `${id}.py uses no manim colour constant`);
    const imp = py.match(/^from lib\.palette import (.+)$/m);
    assert.ok(imp, `${id}.py imports from lib.palette`);
    const used = imp[1].split(',').map((x) => x.trim());
    for (const u of used) assert.ok(names.includes(u) || ['mix', 'ramp'].includes(u), `${id}.py imports ${u}, which palette.py does not define`);
    for (const must of ['BG', 'INK', 'CART', 'POLAR']) assert.ok(used.includes(must), `${id}.py uses ${must}`);
    assert.ok(/^from lib\.narrated import NarratedScene$/m.test(py), `${id}.py imports NarratedScene from lib.narrated`);
    assert.equal((py.match(/^class Main\(NarratedScene\):$/gm) || []).length, 1, `${id}.py defines exactly one class Main(NarratedScene)`);
    assert.ok(new RegExp(`^    narration_id = "${id}"$`, 'm').test(py), `${id}.py: narration_id equals the file name`);
    assert.ok(/self\.camera\.background_color = BG/.test(py), `${id}.py paints the background with BG`);
  }
  assert.ok(/CART/.test(code(scene('two-addresses'))) && /POLAR/.test(code(scene('two-addresses'))));
  assert.ok(/SEAM/.test(code(scene('staircase-roots'))), 'the seam is drawn in SEAM');
});

// ---------- U6: the NarratedScene contract (A4) ----------
test('U6 code inspection: run times come from the beat length, waits are short, no network, no file writes, LaTeX spelling (A4)', () => {
  for (const id of IDS) {
    const py = scene(id);
    const c = code(py);
    assert.ok(!/run_time\s*=\s*[0-9.]+\s*[,)]/.test(c), `${id}: no run_time given as a bare number`);
    const [head, tail] = c.split(/^class Main\(/m);                // the helper classes come before Main
    assert.equal([...tail.matchAll(/\bplay\(|\.wait\(|\.add_sound\(/g)].length, 0, `${id}: Main never plays, waits or adds sound itself; only Shots does`);
    assert.equal([...head.matchAll(/\bplay\(/g)].length, 2, `${id}: Shots plays in two places (go and pop)`);
    assert.ok(!/run_time\s*=\s*(?!length \* self\.t|min\(0\.3, 0\.02 \* self\.t\))/.test(c), `${id}: every run_time is a fraction of the beat length`);
    const waits = c.split('\n').filter((l) => /\.wait\(/.test(l));
    assert.equal(waits.length, 1, `${id}: one wait in the whole file`);
    assert.ok(/self\.s\.wait\(min\(gap, 0\.5 \* self\.t\)\)/.test(waits[0]), `${id}: the only wait is capped at half a beat`);
    // every shot of a beat ends before the last 3% of it (the runtime assert says the same; this is the static check on literal arguments)
    for (const m of c.matchAll(/\bb\.go\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,/g)) assert.ok(Number(m[1]) + Number(m[2]) <= 0.97 + 1e-9, `${id}: b.go(${m[1]}, ${m[2]}) ends after 0.97 of its beat`);
    assert.ok(/assert 0 < length and frac \+ length <= 0\.97/.test(c), `${id}: Shots.go asserts the same at run time`);
    assert.ok(!/\b(requests|urllib|socket|http\.client|subprocess|shutil|tempfile|os\.system|__import__|eval|exec)\b|\bopen\s*\(|write_text|write_bytes|\.mkdir\(/.test(c), `${id}: no network and no file access`);
    const raws = [...py.matchAll(/\br"([^"\n]*)"/g)].map((m) => m[1]);
    for (const r of raws) assert.ok(!/(?<!\\operatorname\{)Arg(?!\})/.test(r.replace(/\\operatorname\{Arg\}/g, '')), `${id}: "${r}" writes Arg without \\operatorname{Arg}`);
    assert.ok(!/\\bar\{|\\conj|\^\*|\\overline(?!\{z\})/.test(py), `${id}: a conjugate is written \\overline{z}`);
  }
  assert.ok(/\\operatorname\{Arg\}/.test(scene('staircase-roots')), 'staircase-roots writes Arg as \\operatorname{Arg}');
  // the one rule of the still contract that code can state: every beat method opens with Shots and a pop
  for (const id of IDS) {
    const methods = scene(id).split(/\n    def /).slice(1).filter((b) => /^(intro|names|set_beat|home|jump|power|roots|principal|branch|cart|polar|same|add_beat|mul|rule|euler)\(self, t\)/.test(b));
    assert.equal(methods.length, VIDEOS[id].segments.length, `${id}: one method per beat`);
    for (const m of methods) assert.ok(/b = Shots\(self, t\)/.test(m) && /b\.pop\(/.test(m), `${id}: ${m.split('(')[0]} opens with b.pop(...)`);
  }
});

// ---------- U7: the numbers the videos speak and show ----------
test('U7 the worked numbers of docs/designs/iter-2/i2-videos-ch1.md section 6, against js/core/complex.js', () => {
  const z = C(-1, S3);
  // 1.3.1: the dot of both videos
  const pz = Cx.toPolar(z);
  near(pz.r, 2, 1e-12, 'r');
  near(pz.theta, (2 * Math.PI) / 3, 1e-12, 'Arg z');
  nearC(Cx.fromPolar(2, (2 * Math.PI) / 3), z, 1e-12, '2 e^{i 2pi/3}');
  nearC(Cx.mul(Cx.C(2, 0), Cx.expi(rad(120))), z, 1e-12, '2 (cos 120 + i sin 120)');
  assert.deepEqual(Cx.argSet(z, { kMin: -2, kMax: 2 }).map((o) => Math.round(deg(o.theta))), [-600, -240, 120, 480, 840], 'the names of arg z');
  for (const o of Cx.argSet(z, { kMin: -3, kMax: 3 })) nearC(Cx.fromPolar(2, o.theta), z, 1e-9, `name ${deg(o.theta)}`);
  assert.equal(Cx.fmtAngle(pz.theta), '2pi/3');
  // beat add: z + (2 - i)
  const s = Cx.add(z, C(2, -1));
  nearC(s, C(1, S3 - 1), 1e-12, 'z + (2 - i)');
  near(Cx.abs(s), Math.sqrt(5 - 2 * S3), 1e-12, '|z + (2 - i)|');
  near(deg(Cx.Arg(s)), 36.20602311300311, 1e-9, 'Arg of the sum');
  // beat mul: z (1 + i)
  const p = Cx.mul(z, C(1, 1));
  nearC(p, C(-1 - S3, S3 - 1), 1e-12, 'z (1 + i)');
  near(Cx.abs(p), 2 * S2, 1e-12, 'length 2 root 2');
  near(deg(Cx.Arg(p)), 165, 1e-9, '120 + 45');
  near(Cx.abs(C(1, 1)), S2, 1e-12);
  near(deg(Cx.Arg(C(1, 1))), 45, 1e-12);
  // 1.1.1, the example of beat rule
  const z1 = C(3, -2);
  const z2 = C(-1, 4);
  nearC(Cx.mul(z1, z2), C(5, 14), 1e-12, 'z1 z2');
  nearC(Cx.div(z1, z2), C(-11 / 17, -10 / 17), 1e-12, 'z1 / z2');
  near(Cx.abs(z1) * Cx.abs(z2), Math.sqrt(221), 1e-12, 'sqrt 13 sqrt 17');
  near(Cx.abs(C(5, 14)), Math.sqrt(221), 1e-12, '|5 + 14i|');
  near(deg(Cx.Arg(z1)), -33.690067525979785, 1e-9);
  near(deg(Cx.Arg(z2)), 104.03624346792648, 1e-9);
  near(deg(Cx.Arg(Cx.mul(z1, z2))), deg(Cx.Arg(z1)) + deg(Cx.Arg(z2)), 1e-9, 'angles add (no wrap needed here)');
  // beat euler
  nearC(Cx.expi(rad(120)), C(-0.5, S3 / 2), 1e-12, 'e^{i 120 deg}');
  // 1.3.2 (beat power)
  const q = C(S3, 1);
  near(Cx.abs(q), 2, 1e-12);
  near(deg(Cx.Arg(q)), 30, 1e-12);
  const q10 = Cx.pow(q, 10);
  nearC(q10, C(512, -512 * S3), 1e-6, '(sqrt 3 + i)^10');
  near(Cx.abs(q10), 1024, 1e-6);
  near(deg(Cx.Arg(q10)), -60, 1e-9, 'Arg of the tenth power');
  for (const name of [30, 390, -330]) near(((10 * name - 300) / 360) % 1, 0, 1e-12, `10 x ${name} is 300 plus whole turns`);
  assert.deepEqual([30, 390, -330].map((a) => 10 * a), [300, 3900, -3300]);
  // 1.4.1 (beat roots)
  const r5 = Cx.rootsOfUnity(5);
  r5.forEach((r, k) => {
    nearC(r, Cx.fromPolar(1, (2 * Math.PI * k) / 5), 1e-12, `root ${k}`);
    nearC(Cx.pow(r, 5), 1, 1e-9, `root ${k} to the 5th`);
  });
  assert.deepEqual(r5.map((r) => Math.round(deg(Cx.Arg(r)) + (Cx.Arg(r) < -1e-9 ? 360 : 0))), [0, 72, 144, 216, 288], 'the angles 0, 72, 144, 216, 288');
  near(r5[1].re, (Math.sqrt(5) - 1) / 4, 1e-12, 'cos 72');
  near(r5[1].im, Math.sqrt(10 + 2 * Math.sqrt(5)) / 4, 1e-12, 'sin 72');
  near(r5[2].re, -(Math.sqrt(5) + 1) / 4, 1e-12, 'cos 144');
  near(r5[2].im, Math.sqrt(10 - 2 * Math.sqrt(5)) / 4, 1e-12, 'sin 144');
  near(deg(2 * Math.PI * 5 / 5), 360, 1e-9, 'step five is 360, which is step zero again');
  // 1.4.2 (beat roots)
  const r4 = Cx.rootsOf(-16, 4);
  [[S2, S2], [-S2, S2], [-S2, -S2], [S2, -S2]].forEach(([re, im], k) => {
    nearC(r4[k], C(re, im), 1e-12, `root ${k} of -16`);
    near(Cx.abs(r4[k]), 2, 1e-12);
    nearC(Cx.pow(r4[k], 4), -16, 1e-9, `root ${k} to the 4th`);
    near(deg(Cx.Arg(r4[k])) + (k >= 2 ? 360 : 0), [45, 135, 225, 315][k], 1e-9, `angle ${k}`);
  });
  // 2.2.2 (beat principal)
  const w = C(0, 2);
  near(Cx.abs(w), 2, 1e-12);
  near(deg(Cx.Arg(w)), 90, 1e-12);
  nearC(Cx.principalRoot(w, 2), C(1, 1), 1e-12, 'principal (2i)^{1/2}');
  nearC(Cx.rootsOf(w, 2)[1], C(-1, -1), 1e-12, 'the other root');
  nearC(Cx.fromPolar(S2, rad(45)), C(1, 1), 1e-12);
  nearC(Cx.fromPolar(S2, rad(225)), C(-1, -1), 1e-12);
  nearC(Cx.pow(C(1, 1), 2), C(0, 2), 1e-12, '(1 + i)^2 = 2i');
  near((90 + 360) / 2, 225);
  // 2.4.1 (beat branch)
  nearC(Cx.branchRoot(-1, 3, 0), C(0.5, S3 / 2), 1e-12, 'cube root of -1 on the window (0, 2pi]');
  near(deg(Cx.branchArg(-1, 0)), 180, 1e-9, 'name of -1 in (0, 360]');
  const above = C(-1, 1e-12);
  const below = C(-1, -1e-12);
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(above, 3, -Math.PI), Cx.branchRoot(below, 3, -Math.PI))) > 1.7, 'the principal branch jumps across the negative real axis (by sqrt 3)');
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(above, 3, 0), Cx.branchRoot(below, 3, 0))) < 1e-9, 'the branch with the seam on the positive real axis does not');
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(C(1, 1e-12), 3, 0), Cx.branchRoot(C(1, -1e-12), 3, 0))) > 1.7, 'but it jumps across the positive real axis');
  nearC(Cx.expi(rad(60)), C(0.5, S3 / 2), 1e-12, 'e^{i 60 deg} = 1/2 + (sqrt 3 / 2) i');
});

// ---------- U8: the one pure function of the scenes, run by Python itself ----------
test('U8 wrap_to(deg, lo) in staircase-roots.py is complex.js branchArg in degrees', { skip: !hasPython && 'python3 is not installed' }, () => {
  const py = scene('staircase-roots');
  const m = py.match(/^def wrap_to\(deg, lo\):[\s\S]*?\n\n\n/m);
  assert.ok(m, 'wrap_to is a module-level function');
  const cases = [[180, -180, 180], [-180, -180, 180], [195, -180, -165], [200, -180, -160], [560, -180, -160], [-240, -180, 120], [129, -180, 129], [273, -180, -87],
    [165, 0, 165], [195, 0, 195], [180, 0, 180], [0, 0, 360], [360, 0, 360], [-90, 0, 270]];
  const prog = `${m[0]}\nimport json\nprint(json.dumps([wrap_to(d, lo) for d, lo, _ in ${JSON.stringify(cases)}]))\n`;
  const r = spawnSync('python3', ['-I', '-c', prog], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(r.stdout);
  cases.forEach(([d, lo, want], i) => {
    near(got[i], want, 1e-9, `wrap_to(${d}, ${lo})`);
    const viaJs = deg(Cx.branchArg(Cx.fromPolar(1, rad(d)), rad(lo)));
    near(viaJs, want, 1e-6, `branchArg for (${d}, ${lo})`);
  });
});

// ---------- U9: both files are valid Python ----------
test('U9 both scenes parse as Python 3', { skip: !hasPython && 'python3 is not installed' }, () => {
  for (const id of IDS) {
    const r = spawnSync('python3', ['-I', '-c', 'import ast, sys; ast.parse(open(sys.argv[1]).read())', path.join(ROOT, 'videos', 'scenes', `${id}.py`)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${id}.py: ${r.stderr}`);
  }
});

// ---------- U10: the rendered files, when they exist (A1) ----------
for (const id of IDS) {
  const have = exists(`media/video/${id}.vtt`) && exists(`media/video/${id}.mp4`);
  test(`U10 ${id}: the rendered captions are the narration and the file fits (A1)`, { skip: !have && 'not rendered yet (node tools/videos/render.mjs --only ' + id + ')' }, async () => {
    const segs = narration(id).segments;
    const blocks = read(`media/video/${id}.vtt`).replace(/\r/g, '').split(/\n\n+/).filter((b) => b.trim());
    assert.equal(blocks[0].trim(), 'WEBVTT');
    const cues = blocks.slice(1).map((b) => {
      const l = b.split('\n');
      const t = l[1].match(/^(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)$/);
      assert.ok(t, `${id}: cue timing line "${l[1]}"`);
      const sec = (h, m2, s2, ms) => Number(h) * 3600 + Number(m2) * 60 + Number(s2) + Number(ms) / 1000;
      return { n: l[0], start: sec(t[1], t[2], t[3], t[4]), end: sec(t[5], t[6], t[7], t[8]), text: l.slice(2).join('\n').trim() };
    });
    assert.equal(cues.length, segs.length, `${id}: one cue per segment`);
    cues.forEach((c, i) => {
      assert.equal(c.n, String(i + 1));
      assert.equal(c.text, segs[i].text, `${id}: cue ${i + 1} text`);
      if (i) near(c.start, cues[i - 1].end, 0.01, `${id}: cue ${i + 1} follows cue ${i}`);
    });
    near(cues[0].start, 0, 0.01);
    const total = cues[cues.length - 1].end;
    assert.ok(total >= 120 && total <= 180, `${id}: captions end at ${total.toFixed(1)} s`);
    const size = fs.statSync(path.join(ROOT, 'media', 'video', `${id}.mp4`)).size;
    assert.ok(size > 200000 && size < 15_000_000, `${id}: ${size} bytes`);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(ROOT, 'media', 'video', `${id}.mp4`)], { encoding: 'utf8' });
    if (probe.status === 0) {
      const d = Number(probe.stdout.trim());
      assert.ok(d >= 120 && d <= 180, `${id}: ffprobe says ${d} s`);
      near(d, total, 0.6, `${id}: the file and the captions agree on the length`);
    }
    const man = await import(pathToFileURL(path.join(ROOT, 'media', 'manifest.js')).href + `?t=${Date.now()}`);
    const e = man.VIDEOS.find((v) => v.id === id);
    assert.ok(e, `${id}: media/manifest.js lists the video`);
    assert.equal(e.station, VIDEOS[id].station);
    assert.equal(e.src, `media/video/${id}.mp4`);
    assert.equal(e.captions, `media/video/${id}.vtt`);
  });
}
```

---

## Appendix D. `tests/interact/i2-videos-ch1.mjs` (validated)

Passes 4 of 4 (two routes, desktop and phone) against a scratch copy of the site that holds the rendered files and the generated manifest.

```js
// tests/interact/i2-videos-ch1.mjs: the two Chapter 1 videos, as far as a browser can check them
// (acceptance criteria A1 and the manifest half of A3 of goal i2-videos-ch1).
//   node tools/smoke.mjs --route addresses --script tests/interact/i2-videos-ch1.mjs
//   node tools/smoke.mjs --route staircase --script tests/interact/i2-videos-ch1.mjs
// Design: docs/designs/iter-2/i2-videos-ch1.md section 7.3. Runs at desktop (1280) and phone (390).
// The files come from `node tools/videos/render.mjs --only two-addresses,staircase-roots`; the stills of A3 are looked at by a person.
// Nothing here depends on a station having embedded the video yet: when the page has no panel for it, the script builds one with
// js/core/listen.js on a fixture host, which checks the manifest-to-panel contract the stations rely on.

const VIDEO_OF_ROUTE = { addresses: 'two-addresses', staircase: 'staircase-roots' };
const STATION_OF_VIDEO = { 'two-addresses': 'addresses', 'staircase-roots': 'staircase' };
const SEGMENTS = {
  'two-addresses': ['intro', 'cart', 'polar', 'same', 'add', 'mul', 'rule', 'euler'],
  'staircase-roots': ['intro', 'names', 'set', 'home', 'jump', 'power', 'roots', 'principal', 'branch'],
};
const MAX_BYTES = 15_000_000;

// Tearing the panel down while the browser is still fetching the video aborts that request, which the harness reports as a failed
// request. Only these two file names are excused; a missing file still fails the HTTP 200 check below.
export const expectedErrors = [/^request failed: \S+\/media\/video\/(?:two-addresses|staircase-roots)\.(?:mp4|vtt)$/];

export default async function (page, ctx) {
  const { assert, log, route, viewport } = ctx;
  const id = VIDEO_OF_ROUTE[route];
  if (!id) { log(`route "${route}" carries no Chapter 1 video: nothing to check`); return; }
  const phone = viewport.width < 500;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // 1. The generated manifest lists the video with the station, the paths and a length of 2 to 3 minutes.
  const entry = await ev(async (id) => {
    const m = await import(new URL('./media/manifest.js', location.href).href);
    return (m.VIDEOS || []).find((v) => v.id === id) || null;
  }, id);
  assert(entry, `media/manifest.js has no VIDEOS entry "${id}" (run node tools/videos/render.mjs --only ${id})`);
  assert(entry.station === STATION_OF_VIDEO[id], `${id}: station is "${entry.station}", expected "${STATION_OF_VIDEO[id]}"`);
  assert(entry.src === `media/video/${id}.mp4`, `${id}: src is ${entry.src}`);
  assert(entry.captions === `media/video/${id}.vtt`, `${id}: captions is ${entry.captions}`);
  assert(entry.seconds >= 118 && entry.seconds <= 182, `${id}: ${entry.seconds} s is outside 2 to 3 minutes`);
  assert(typeof entry.title === 'string' && entry.title.length > 0 && entry.summary.length >= 40, `${id}: title and summary are present`);
  log(`manifest: ${id} ${entry.seconds} s, station ${entry.station}, narrated ${entry.narrated}`);

  // 2. The captions are the narration: one cue per segment, in order, the same text, back to back from 0.
  const data = await ev(async (entry) => {
    const [n, v] = await Promise.all([fetch(`media/narration/videos/${entry.id}.json`).then((r) => r.json()), fetch(entry.captions).then((r) => r.text())]);
    const cues = v.replace(/\r/g, '').split(/\n\n+/).slice(1).filter((b) => b.trim()).map((b) => {
      const lines = b.split('\n');
      const m = lines[1].match(/^(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)$/);
      const t = (a, b2, c, d) => Number(a) * 3600 + Number(b2) * 60 + Number(c) + Number(d) / 1000;
      return { start: t(m[1], m[2], m[3], m[4]), end: t(m[5], m[6], m[7], m[8]), text: lines.slice(2).join('\n').trim() };
    });
    return { head: v.split('\n')[0], narration: n, cues };
  }, entry);
  const segs = data.narration.segments;
  assert(data.head.trim() === 'WEBVTT', `${id}: the .vtt does not start with WEBVTT`);
  assert(segs.map((s) => s.id).join() === SEGMENTS[id].join(), `${id}: segment ids are ${segs.map((s) => s.id).join()}`);
  assert(data.cues.length === segs.length, `${id}: ${data.cues.length} cues for ${segs.length} segments`);
  data.cues.forEach((c, i) => {
    assert(c.text === segs[i].text, `${id}: cue ${i + 1} text differs from segment "${segs[i].id}"`);
    assert(c.end > c.start, `${id}: cue ${i + 1} has no length`);
    if (i === 0) assert(Math.abs(c.start) < 0.01, `${id}: the first cue starts at ${c.start}`);
    else assert(Math.abs(c.start - data.cues[i - 1].end) < 0.01, `${id}: cue ${i + 1} does not follow cue ${i}`);
  });
  const total = data.cues[data.cues.length - 1].end;
  assert(total >= 120 && total <= 180, `${id}: captions end at ${total.toFixed(1)} s, outside 120 to 180`);
  log(`captions: ${data.cues.length} cues, ending at ${total.toFixed(1)} s`);

  // 3. The video file is there, is an MP4 and is under 15 MB.
  const file = await ev(async (src) => {
    const r = await fetch(src);
    const buf = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, bytes: buf.length, ftyp: String.fromCharCode(...buf.slice(4, 8)) };
  }, entry.src);
  assert(file.status === 200, `${id}: ${entry.src} answers HTTP ${file.status}`);
  assert(file.ftyp === 'ftyp', `${id}: ${entry.src} is not an MP4 (box "${file.ftyp}")`);
  assert(file.bytes > 200000 && file.bytes <= MAX_BYTES, `${id}: ${entry.src} is ${file.bytes} bytes (limit ${MAX_BYTES})`);
  log(`file: ${(file.bytes / 1048576).toFixed(2)} MB`);

  // 4. The video panel: the station's own if it already embeds the video, else one built with listen.js on a fixture host.
  let host = null;
  let panelId = `video-${id}`;
  await page.waitForSelector(`#${panelId}`, { timeout: 2500 }).catch(() => {});       // a station builds its panel a moment after load
  const embedded = await ev((pid) => !!document.getElementById(pid), panelId);
  if (!embedded) {
    const built = await ev(async (id) => {
      const L = await import(new URL('./js/core/listen.js', location.href).href);
      const h = document.createElement('section');
      h.id = 'i2v-host';
      document.getElementById('view').appendChild(h);
      const p = await L.videoPanel(h, id);
      return !!p;
    }, id);
    assert(built, `listen.js videoPanel(host, "${id}") resolved null although the manifest lists the video`);
    host = true;
  }
  log(embedded ? `panel: the station embeds ${panelId}` : `panel: built on a fixture host (the station does not embed ${id} yet)`);
  const canPlay = await ev((pid) => !!document.getElementById(`${pid}-player`).canPlayType('video/mp4; codecs="avc1.42E01E"'), panelId);
  const panel = await ev(async ({ pid }) => {
    const el = document.getElementById(pid);
    const video = document.getElementById(`${pid}-player`);
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = video.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    const track = video.querySelector('track');
    const src = video.querySelector('source');
    return {
      heading: (document.getElementById(`${pid}-title`) || {}).textContent || '',
      controls: video.hasAttribute('controls'), playsinline: video.hasAttribute('playsinline'), preload: video.getAttribute('preload'),
      autoplay: video.hasAttribute('autoplay'), loop: video.hasAttribute('loop'),
      track: track ? { kind: track.getAttribute('kind'), def: track.hasAttribute('default'), src: track.getAttribute('src') } : null,
      source: src ? src.getAttribute('src') : video.getAttribute('src'),
      w: r.width, h: r.height, pw: pr.width, vw: window.innerWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, { pid: panelId });
  assert(panel.heading.startsWith('Watch (2\u20133 min)'), `${id}: panel heading is "${panel.heading}"`);
  assert(panel.controls && panel.playsinline && panel.preload === 'metadata', `${id}: the player needs controls, playsinline and preload="metadata"`);
  assert(!panel.autoplay && !panel.loop, `${id}: the player must not autoplay or loop`);
  assert(panel.track && panel.track.kind === 'captions' && panel.track.def && panel.track.src === entry.captions, `${id}: the captions track is missing or wrong (${JSON.stringify(panel.track)})`);
  assert(panel.source === entry.src, `${id}: the player source is ${panel.source}`);
  assert(panel.over <= 1, `${id}: the page scrolls sideways by ${panel.over}px with the panel`);
  if (phone) assert(panel.pw >= 300 && panel.pw <= panel.vw, `${id}: on a phone the panel is ${panel.pw}px wide in a ${panel.vw}px viewport`);
  else assert(panel.pw >= 400, `${id}: on a desktop the panel is only ${panel.pw}px wide`);
  log(`panel: ${Math.round(panel.pw)} px wide, player ${Math.round(panel.w)} x ${Math.round(panel.h)} px`);

  // 5. When the browser can decode H.264 the player is 16:9 and the metadata says the same length as the manifest. The harness's
  // Chromium cannot decode it: listen.js then hides the player and shows its error line, and this step is skipped.
  if (canPlay) {
    assert(Math.abs(panel.w / panel.h - 16 / 9) < 0.03, `${id}: the player is ${panel.w} x ${panel.h}, not 16:9`);
    if (phone) assert(panel.w >= 280 && panel.w <= panel.vw - 16, `${id}: on a phone the player is ${panel.w}px wide in a ${panel.vw}px viewport`);
    const dur = await ev((pid) => new Promise((res) => {
      const v = document.getElementById(`${pid}-player`);
      if (v.readyState >= 1) return res(v.duration);
      v.addEventListener('loadedmetadata', () => res(v.duration), { once: true });
      v.addEventListener('error', () => res(-1), { once: true });
      setTimeout(() => res(-2), 5000);
    }), panelId);
    assert(dur > 0 && Math.abs(dur - entry.seconds) <= 1.5, `${id}: the browser read a duration of ${dur} s, the manifest says ${entry.seconds} s`);
    log(`metadata: ${dur.toFixed(1)} s`);
  } else {
    log('this browser has no H.264 decoder: the 16:9 and metadata checks are skipped');
  }
  if (host) await ev(() => document.getElementById('i2v-host')?.remove());
}
```
