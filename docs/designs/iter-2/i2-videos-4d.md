# Design: i2-videos-4d

Goal `i2-videos-4d` (iteration 2, wave 1, kind `video`, size M): the manim explainer **shadows-4d**, "the picture behind every
picture". The graph of w = f(z) needs four numbers, nobody can see it, and every picture on the site is one of its shadows. Five
shadows in seven beats, 2 min 33 s, silent and captioned, rendered at 480p15 for the loop and 720p30 for the deliverable.

Owned files (the only ones this goal may create or edit): `videos/scenes/shadows-4d.py`, `media/narration/videos/shadows-4d.json`,
and, as in every goal, this file and `tests/unit/i2-videos-4d.test.mjs` (no interaction script, see 7.3). The
rendered `media/video/shadows-4d.mp4`, `media/video/shadows-4d.vtt` and the regenerated `media/manifest.js` are outputs of
`tools/videos/render.mjs`, not hand-written files.

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md` (Media track), `docs/STORY.md` (0, 1 "The picture behind every picture", 4,
8 V5, 10), `docs/ARCHITECTURE.md` (1, 3.11, 3.12, 11.4, 11.8), `docs/goals/iter-2.json` (this goal and `i2-videos-ch1`, whose A2
this goal's A2 refers to), `videos/lib/narrated.py`, `videos/lib/palette.py`, `tools/videos/render.mjs`, `js/core/domaincolor.js`,
`js/core/three-view.js` (`stereographic`, `inverseStereographic`, `rotate4`, `riemannPoint`, `argColor`, `HIDDEN_RAMP_STOPS`),
`js/registry.js` (the `graph4d` entry already carries `video: 'shadows-4d'`), `js/stations/graph4d.js` (it already calls
`videoPanel(videoHost, 'shadows-4d')`, so nothing is needed on the station side), `css/theme.css` (dark block),
`docs/designs/iter-2/i2-media-core.md` (house style, the panel ids and sizes).

**Status and evidence.** `videos/scenes/shadows-4d.py` and the narration JSON do not exist in the repo yet. To make sure this
design is implementable without guessing, a **throwaway reference implementation** of everything below was built and run in the
scratchpad (outside the repo; it may not exist when you read this; **Appendix A is its final source and Appendix B its narration**,
so the builder can start from them, and where prose and Appendix differ the Appendix is what was verified). Measured with
manim Community 0.22.0 (the version on the student's machine), Python 3.13, numpy 2.5, LaTeX present:

| Check | Result |
|---|---|
| `manim -ql` (480p15) | exit 0, 149 animations, **2 min 19 s wall (1 min 52 s CPU)**, 152.7 s long, **3.47 MB**, 7 cues in the `.vtt`, each beat exactly its estimated length (no beat overran) |
| `manim -qm` (720p30) | exit 0, 1280 x 720 at 30 fps, 152.7 s, **6.2 MB** (limit 15 MB); **9 min 26 s** wall on a busy shared box (5 min 49 s on a quiet one, measured on the run before the last edit of the `close` text) |
| pure-maths half run under `python3 -I` and compared with `js/core/domaincolor.js` `colorXY` (11 points, both ring modes) and `js/core/three-view.js` (`stereographic`, `rotate4`, `riemannPoint`, `argColor`, `hiddenRamp`, `HIDDEN_RAMP_STOPS`) | 0 mismatches (Appendix C) |
| narration checks of A2 (beat ids, word counts, required phrases, no `$` or backslash, no hex colour, palette import) | all pass (Appendix B has the counts) |
| stills at every cue start + 0.5 s, and surfaces + 4.5 s | read and judged against A3, all six pictures as described (screenshots were reviewed by eye during design; the builder repeats them, 7.2) |

---

## 0. Decisions, discrepancies, differences

### 0.1 Decisions a builder or reviewer might otherwise trip over

| # | Decision | Why |
|---|---|---|
| D1 | `class Main(NarratedScene, ThreeDScene)`, in exactly that base order. | The goal allows a ThreeDScene mix-in "as long as NarratedScene's `beat` and `tear_down` are kept". With `NarratedScene` first, `setup`, `beat`, `beat_length` and `tear_down` are NarratedScene's, `__init__` is ThreeDScene's, and a regex such as `class Main\(\s*NarratedScene` (the test of A2) matches. Verified: 7 cues, vtt written. |
| D2 | The file has **two halves** separated by the line `# ---- scene: manim below this line (...)`. Above it: only `math` and `numpy`, all the maths. Below it: `from manim import *`, `lib.narrated`, `lib.palette` and the scene. | Acceptance A4 asks for inspection of the maths; a unit test can only check numbers if it can import them without manim (not installable in CI). The test cuts the source at the marker and runs the upper half under `python3 -I`. Nothing above the marker may import manim or `lib.*`, and the marker text must not appear earlier in the file (not even in the docstring: the docstring says "the marker comment before `from manim import *`"). |
| D3 | `self.camera.should_apply_shading = False`. | manim shades 3D faces by their normal. That repaints the viridis surfaces and the hue-coloured sheets, so colour would no longer mean the number it is the legend of (STORY section 4: "the same wheel is the legend everywhere"). Flat colours plus a thin `BG` mesh line read as 3D well enough (checked in stills). |
| D4 | The quarter turn goes from **0 to -90 degrees** with the formula of `rotate4` (`u' = u cos a - v sin a`), not +90. | `rotate4(p, {uv: +pi/2})` sends (x, y, u, v) to (x, y, -v, u), the Im surface upside down; the site's 4D station shows that one. A video that says "the imaginary surface, height v" must end on height +v. With uv = -pi/2 the same formula gives (x, y, v, -u). The code is the same function (`rotate_uv`), only the direction of travel differs; the colour then ends as -u and the on-screen text says so ("height v, colour -u"). |
| D5 | The Riemann sheets are sampled in `s = r^(1/3)` (`r = s^3`), not in `r`. | Im(z^(1/3)) = r^(1/3) sin(theta/3) has infinite slope at r = 0; equal steps in r make the first ring a vertical wall that the painter's sort draws as a stray pole (seen in the first prototype). Equal steps in s make the height linear in s. The set of points is the same graph, `riemann_point(s**3, theta)` still computes `r ** (1/3)`. |
| D6 | A beat is scheduled with **absolute cues**, not summed `run_time`s: `Clock.until(sec)`, in the seconds of the *silent estimate* (`max(1.5, words / 2.5) + 0.35`, the formula of `narrated.py`). `Clock.k = t / estimate` rescales every cue when real audio makes a beat longer or shorter. | Summed fractions overran (first prototype: intro 22.6 s instead of 20.75 s). With absolute cues the cue table below is readable ("at 3.2 s the quarter turn starts") and survives the audio run. |
| D7 | Every beat **opens with its picture already composed** (a 0.4 s fade-in, nothing built from empty) and ends with a 0.3 s fade-out of everything but the tag. | A3 reads stills at "cue start + 0.5 s"; they must show the picture, not its first stroke. The animation that follows (cursor ring, probe, turn, laps) is the explanation. |
| D8 | The five thumbnails of `close` are **snapshots of the real frames** (`self.renderer.camera.pixel_array`, cropped) taken at the end of each picture beat. | Five faithful miniatures with no second implementation of five pictures. The crop boxes are in scene units, so they are right at every quality. Requires the default Cairo renderer; all seven beats must have run before `close` (a partial render raises `KeyError`, by design). |
| D9 | The hidden-coordinate ramp is a local tuple list `HIDDEN_STOPS` (integer RGB, five stops) copied from `HIDDEN_RAMP_STOPS` in `three-view.js`, and a unit test pins the two equal. | `lib/palette.py` has no viridis (and is not owned by this goal). Integer tuples are not "literal hex colours" (A2) and the pin makes drift visible. Request for another owner in 9. |
| D10 | `Text` is used without a `font=`; formulas use `MathTex`. | The student's machine and the cloud box have different fonts; the platform default always exists. Glyphs used beyond ASCII: `½ ¼ ¾ · → − ° ∞` (all in the default fonts of macOS and DejaVu). LaTeX is required (BasicTeX is already a README step). |
| D11 | Numbers on screen use a real minus sign (U+2212) and two decimals (`sgn`, `cplx` in the scene half). | Plain-text on the site uses ASCII `-`, but this text is drawn, not matched by tests, and `1.00 + -1.15i` reads badly. |
| D12 | `media/narration/videos/shadows-4d.json` follows the `i2-videos-ch1` A2 field rules (the goal says "JSON fields as in i2-videos-ch1 A2"): `id`, `title`, `summary` >= 40 characters, `station: "graph4d"`, `music: { prompt >= 20 characters, seconds 20 to 40 }`, 7 segments of 12 to 60 words, 300 to 450 words in total. | The ch1 goal is being built concurrently from the same wording; the same checks are in this goal's unit test. |

### 0.2 Discrepancies in the goal text, and how this design resolves them

| # | Discrepancy | Resolution (binding for the builder and both reviews) |
|---|---|---|
| S1 | A3 says the `surfaces` still 4 s later shows "the caption changing from real to imaginary". The goal's narration order puts "real surface" first and the turn second, and the beat opens with the narrator naming the real surface. | The on-screen label (not the `.vtt`) has three states: "real surface" until 3.2 s; **"real → imaginary"** with "turning in the u–v plane" while the quarter turn runs (3.2 s to 6.8 s, 25 degrees per second); "imaginary surface" after. At cue start + 4.5 s the surface is turned by 32 degrees and the label reads "real → imaginary". The narration is written so the sentence "Turn it a quarter turn inside four dimensions" starts at 3.2 s. |
| S2 | A3 asks 'riemann' for "a helical multi-sheet surface". The graph of Im z^(1/3) is not a helicoid: three sheets are joined at the branch point and pass through each other. | The picture is that surface (three sheets, hue = angle of the root, so the three values above one point have three colours), plus a helix (the walker's path, three laps) drawn on it. The narration says "sheet" and "staircase of angles", never "helix". |
| S3 | A1 says "the .vtt has 7 cues in order with the JSON texts". | `NarratedScene.tear_down` writes one cue per beat with the segment text; verified on the prototype (7 cues, texts equal). The test compares them when the file exists (skipped when `media/video` is not rendered). |
| S4 | A1: "ffprobe duration 120 to 180 s". | The estimate is the sum of `max(1.5, words / 2.5) + 0.35` = **152.85 s** for 376 words; measured 152.73 s. Expected value for the check: 152.85 plus or minus 1.0. |
| S5 | A4 says the Riemann surface is "over theta in [0, 6pi)". | It is: `v_range = [0, 2pi]` for the highlighted sheet plus `[2pi, 6pi]` for the other two, in two `Surface` objects so the branch beat can fade the other two. |
| S6 | The registry's `graph4d.walk.do` says "scrub the u-v angle from 0 to 90 degrees". The video turns 0 to -90. | Not a conflict: the station's slider and the video both show Re becoming Im; the station's Im is upside down (D4) and says so. A note for the station's owner is in 9. |
| S7 | The goal says the dark-theme background "in every still". | The palette is the dark theme (`BG` is `--bg` of the dark block). The video is always dark, also when the site is in the light theme (3). |

### 0.3 Differences between ARCHITECTURE and the code on disk (the code wins)

- `docs/ARCHITECTURE.md` 11.8 says Length "300 to 450 narration words at 2.5 words per second". The 2.5 is `WORDS_PER_SECOND` in `videos/lib/narrated.py`; the 0.35 s pad (`PAD_SECONDS`) and the 1.5 s minimum (`MIN_BEAT_SECONDS`) are also in that file; this design imports all three, so a change there follows through.
- `tools/videos/render.mjs` passes `-o <id>`, so manim writes `build/manim/videos/shadows-4d/<res>/shadows-4d.mp4`; the render script copies it to `media/video/shadows-4d.mp4`. The prototype was rendered without `-o` (file name `Main.mp4`); nothing in the scene depends on the name.
- `NarratedScene.beat(...)` yields the beat length **including** the 0.35 s pad, and does not truncate: a beat that overruns just gets a longer cue. The `Clock` keeps every action inside the length.

---

## 1. Goal restatement, story thread, problems and topics covered

**Goal.** Produce a rendered, captioned, silent 720p explainer of 2 to 3 minutes and under 15 MB: `media/video/shadows-4d.mp4` and
`.vtt`, its narration script `media/narration/videos/shadows-4d.json`, and a regenerated `media/manifest.js` that lists
`shadows-4d` with station `graph4d`. The scene is one `Main(NarratedScene, ThreeDScene)` with seven beats, in this order and with
these ids: `intro`, `side`, `domain`, `surfaces`, `riemann`, `sphere`, `close`.

**Story thread carried (STORY "The picture behind every picture", section 8 V5).** The graph of w = f(z) is the set of points
(x, y, u, v). Nobody can see it, so every view on the site is a shadow: side by side (the two flat shadows, tied by the clock),
domain colouring (the (x, y) shadow with (u, v) painted on it as hue and brightness), the real and imaginary surfaces (a rotation
in the u–v plane turns one into the other), the Riemann surface of the cube root (the staircase of Thread 2 made solid) and the
Riemann sphere (where 1/z is a half-turn). Five pictures, one object. The two-address colour code is the spine of the picture:
the **Cartesian address** of z is where you stand on the painted plane (blue), the **polar address** of w is the colour you see
(orange: hue is its angle, brightness is its length), and the sphere beat shows 1/z in polar terms as "invert the length, mirror the
angle" which is one half-turn.

**How it shows on screen.** Seven pictures on the dark background, each opening composed (D7); a small grey tag at the top left
("3 of 5 · real and imaginary") says which shadow it is; on-screen words are labels, never the narration (the narration is in the
captions). Section 2 has the frames and the exact text.

**Review problems and topics covered (the goal's `assignment_refs`).**

| Ref | Where in the video | Cartesian and polar form |
|---|---|---|
| **2.5.1** image of \|z - 1\| = 1 under w = 1/z | `sphere` beat: the circle on the sphere, the half-turn, the inset showing the line Re w = 1/2 | section 6.1 |
| **2.4.1** a branch of z^(1/3) continuous on the negative real axis | `riemann` beat, last third: the sheet 0 < theta < 2pi, the cut over the positive real axis (red, with the jump), the negative real axis (green, smooth), the formula | section 6.2 |
| T2.5 reciprocal map and the extended plane | `sphere` (infinity is the north pole; 1/z swaps 0 and infinity) | 6.1 |
| T2.4 multiple-valued functions and branches | `riemann` (three values at every point, three laps bring you home, a branch is one sheet) | 6.2 |
| T3.1 derivatives | `side` beat, last third: a tiny square at one dot comes out a tiny square, turned and stretched; f'(z) = 2z | 6.3 |
| (supporting) 2.1.2-like picture, z² and domain colouring | `side`, `domain`, `surfaces` all use w = z² | 6.4, 6.5 |

---

## 2. UX

A video has no controls of its own. The student meets it in the station's panel (`i2-pictures` embeds it on `graph4d`; ids from
`i2-media-core`): `section#video-shadows-4d` containing `h2#video-shadows-4d-title` ("Watch (2–3 min)") and
`video#video-shadows-4d-player[controls][playsinline][preload=metadata]` with the `.vtt` as a default captions track. This goal
adds no HTML, no JavaScript and no CSS. What it designs is what is *in* the frame, how it paces, and what the captions say.

### 2.1 The panel (for orientation; owned by media-core and pictures)

```
Desktop 1280 px (video measures 918 x 516)            Phone 390 px (video measures 324 x 182)
Watch (2–3 min)                                        Watch (2–3 min)
+--------------------------------------------+         +--------------------------+
|                                            |         |                          |
|   the 854 x 480 (or 1280 x 720) frame      |         |   the same frame, scaled |
|   described in 2.2                         |         |   down; read it in       |
|                                            |         |   fullscreen             |
+--------------------------------------------+         +--------------------------+
| [play] 0:21 / 2:33  ----o------  [CC] [vol] [full]    | [play] 0:21 / 2:33  [CC] |
+--------------------------------------------+         +--------------------------+
captions: the narration sentences, one cue per beat (7 cues), on by default
```

Controls are the browser's native ones. Pointer and touch: click or tap to play and pause, drag the bar to seek. Keyboard (native):
Space or K play and pause, Left and Right seek, Up and Down volume, F fullscreen, M mute; the captions button is in the control bar.
Nothing autoplays. The station never needs the video (the page works with no manifest entry).

### 2.2 The seven frames (the frame is 14.22 x 8 scene units at every quality)

The wireframes are of the moment given; "cue" times are the silent estimate of 5.1 and scale with audio. The same layout serves
desktop and phone because it is one raster.

**1 intro** (20.75 s) at 9.5 s:
```
+---------------------------------------------------------------------------------+
| the graph of w = f(z)                                                           |
|                                 w = f(z)                                        |
|   z                                 f                       w                   |
|   y|                         ------------->                 v|                  |
| ---+---.---- x                                           ----+--.--- u          |
|    |                                                         |                  |
|                                                                                 |
|            x = 1     y = 1     u = 0     v = 2                                  |
|            \__________ four numbers __________/                                 |
+---------------------------------------------------------------------------------+
```
At 12.0 to 19.2 s the two planes are gone and the four chips sit under the title with five boxes fanned out below them:
`1 side by side`, `2 painted plane`, `3 real and imaginary`, `4 root staircase`, `5 sphere`.

**2 side** (23.95 s) at 0.5 s (still of A3) and at 21.5 s:
```
+---------------------------------------------------------------------------------+
| 1 of 5 · side by side                                                           |
|     z = x + iy                                        w = z² = u + iv           |
|   y|     1 o                                       v|   o 1                      |
|    |    ¾ o                    f                    |  ¾ o                       |
| ---+-----½ o------ x       ----------->           --+---½ o---- u               |
|    |    ¼ o                 t: 0 → 1                |  ¼ o                       |
|    |     0 (o)  <- ring at t = 0                    | o 0 (o)                    |
+---------------------------------------------------------------------------------+
| (21.5 s: pair shrunk to the top) ( ▢ )       up close:        ( turned ▢ )      |
|                                  f'(z) = 2z   stretch 2.44, turn −35°           |
+---------------------------------------------------------------------------------+
```
The stroke and its image are teal-to-white (input) and pink-to-white (output), lightness by time. Five dots at t = 0, ¼, ½, ¾, 1
are the same colour on both planes, labelled `0 ¼ ½ ¾ 1`. A white ring (the clock) sits on the same t on both planes.

**3 domain** (23.55 s) at 0.5 s, 11 s and 22 s:
```
+---------------------------------------------------------------------------------+
| 2 of 5 · painted plane                                                          |
| z                                  w = z²                      (colour wheel)   |
| +-------------------+                y|                        hue: its angle    |
| | red band on the   |               ---+---o w                 brightness:       |
| | real axis, cyan on|                  | /)                    its length        |
| | the imaginary,    |                  |/                                          |
| | black at 0, rings |   z = 1.00 + 0.50i   Cartesian: x = 1.00, y = 0.50          |
| +-------------------+   w = 0.75 + 1.00i   polar: r = 1.25, θ = 53.1°              |
|  place: x, y   colour: w   [red] red: w on the positive real axis                  |
|                            [black] black: w = 0                                    |
+---------------------------------------------------------------------------------+
```
The probe dot with its two dashed blue drop lines is the Cartesian address of z; the orange ray and arc in the small w plane are
the polar address of w; the dot at the end of the ray has the colour found under the probe.

**4 surfaces** (18.75 s) at 0.5 s and 4.5 s (A3):
```
+---------------------------------------------------------------------------------+
| 3 of 5 · real and imaginary                           real surface              |
|                                                       height u, colour v         |
|            ~~~~~~~ saddle on a faint floor grid                       colour     |
|           /                    \___                                   [viridis]  |
|          /_______________________/                                    [ bar    ] |
|                                                                                 |
+---------------------------------------------------------------------------------+
   4.5 s: the same surface turned 32 degrees, label "real → imaginary", sub "turning in the u–v plane"
```
**5 riemann** (22.75 s) at 0.5 s, 4.5 s, 10 s and 21 s: three interpenetrating hue-coloured sheets meeting at the branch point; a
dashed blue vertical through one floor point with three dots `w1 w2 w3`; a white path that goes round three times with the label
`lap 1 of 3` (then 2, 3); then the first sheet alone with a red cut over the positive real axis and a dashed red jump, a green curve
on the negative real axis, and the formula `f(z) = r^(1/3) e^(iθ/3), 0 < θ < 2π`.

**6 sphere** (23.55 s) at 0.5 s and 21 s: a translucent sphere with a faint graticule, a grey equator, the north pole labelled `∞`
and the south pole `0`, a teal ramped circle through the south pole with four dots; later the dashed axis through `1` and `-1`,
the same circle half-turned (pink, through the north pole, with the teal ghost left behind), and a small plane at the right: the
teal circle `|z - 1| = 1` and the pink vertical line `Re w = ½` with arrowheads and `∞` at both ends and dots at ¼, ½, ¾.

**7 close** (19.55 s) at 0.5 s: five bordered tiles in a row (the five snapshots, `side by side` wider than the others) with their
names under them, the object `{(x, y, u, v) : w = f(z)}` above, and five lines from the object down to the tiles. A tile whose
phrase is being spoken gets a white border; at the end all five do.

### 2.3 On-screen copy (the exact words; plain, direct)

| Beat | Text on screen |
|---|---|
| all | tag at the top left, grey: intro `the graph of w = f(z)`; side `1 of 5 · side by side`; domain `2 of 5 · painted plane`; surfaces `3 of 5 · real and imaginary`; riemann `4 of 5 · root staircase`; sphere `5 of 5 · sphere`; close `five pictures, one object` |
| intro | `w = f(z)`; axis letters `x y u v`; plane names `z`, `w`; chips `x = 1`, `y = 1`, `u = 0`, `v = 2`; `four numbers`; the dashed fourth axis `v ?`; box names as listed above |
| side | `z = x + iy`, `w = z² = u + iv`, `f`, `t: 0 → 1`, `0 ¼ ½ ¾ 1`, `up close:`, `f'(z) = 2z`, `stretch 2.44, turn −35°` |
| domain | `z`, `w = z²`, `place: x, y`, `colour: w`, `hue: its angle`, `brightness: its length`, the two readout lines (formats in 5.3), `red: w on the positive real axis`, `black: w = 0` |
| surfaces | `real surface` / `height u, colour v`; `real → imaginary` / `turning in the u–v plane`; `imaginary surface` / `height v, colour −u`; `colour` over the bar |
| riemann | `height: Im of the cube root` / `colour: angle of the root`; `w1 w2 w3`; `lap 1 of 3`; `the cut: positive real axis`; `negative real axis: smooth`; the formula |
| sphere | `∞`, `0`, `1`, `-1`, `z = 0.0 ... z = 8.2 ... z → ∞` (live), `\|z - 1\| = 1`, `Re w = ½`, `∞` at both ends of the line, `1/z swaps 0 and ∞` |
| close | the five names; `{(x, y, u, v) : w = f(z)}`; `a question about the image of a shape: read this one`; `turn the object, and all five are there` |

The spoken words are Appendix B. The `.vtt` has one cue per beat (7), each cue the whole segment text.

### 2.4 Empty, loading and error states

- **No render yet.** `media/manifest.js` has no `shadows-4d` entry, so the station shows no panel (media-core). Nothing here changes.
- **Silent render (this goal's deliverable).** Pacing is the word-count estimate; captions are the script. A student who never presses CC still gets every picture, because the pictures carry the shapes and the labels carry the names.
- **Voiced render (the local agent).** Beats are as long as their clips plus 0.35 s; `Clock` rescales every cue (D6). Nothing in this file changes.
- **Loading.** Native `preload="metadata"`: the first frame is the blank dark frame with the tag; no poster is designed (the station owns that).
- **Errors at render time** (all fail loudly, none silently): missing narration JSON (`KeyError`/`FileNotFoundError` from `NarratedScene.setup`); a segment id used in `beat()` but absent from the JSON (`KeyError` naming it); LaTeX missing (manim's own error from `MathTex`); `close` rendered without the five earlier beats (`KeyError: 'side'`). A beat that overruns its length is not an error (the cue is longer).

### 2.5 Pacing and interaction inside the video

Nothing is interactive. Motion budget (accessibility, 8.4): fades 0.3 to 0.5 s; the only fast thing is the quarter turn at 25 degrees per second; the camera moves at most 25 to 30 degrees in 2.5 to 6.5 s; nothing flashes. Every motion starts on a phrase boundary of the narration (tables in 5.3).

---

## 3. Visual encoding (design language of `docs/CONSTRAINTS.md`, both themes)

**Both themes.** A video is a raster; it has one theme. `videos/lib/palette.py` is the **dark** block of `css/theme.css` (tested by
`i2-media-core`), so the video is dark in both site themes; its frame sits in the station's panel, which uses the page tokens. All
text has a contrast ratio of at least 7.5:1 on `BG` (computed: INK 16.0, MUTED 8.6, CART 7.8, POLAR 9.1, INPUT 9.6, OUTPUT 8.2,
WARN 7.7, OK 9.7; `SEAM`, 6.5, is used for outlines and the equator only), so nothing depends on the light theme's tokens.

| Role | Palette name (`lib.palette`) | Used for |
|---|---|---|
| Background | `BG` | frame; also the thin mesh line of surfaces (`stroke_color=BG`) |
| Panel and tile fill, sphere body | `SURFACE` | tiles, magnifier discs, sphere fill at 35 percent |
| Main text, the point z, the clock ring, formulas | `INK` | |
| Secondary text, axes, grid, floor grid, fan lines | `MUTED` | |
| Everything Cartesian: x, y, u, v letters, drop lines, tuple chips, the vertical through three sheets | `CART` | "slide" |
| Everything polar: ray, arc, hue and brightness words, "stretch 2.44, turn −35°" | `POLAR` | "move" |
| z-plane stroke, its dots, the circle in the plane and on the sphere | `INPUT` (with `ramp(INPUT, t)`) | input |
| w-plane stroke, its dots, the half-turned circle, the line Re w = 1/2 | `OUTPUT` (with `ramp(OUTPUT, t)`) | output |
| Time | `ramp(base, t, weight)` from `T0` (start, dark) to `T1` (end, bright); stroke weight 0.4 (default), dots 0.6 | same ramp as `plane.js` (`palette.ramp`) |
| Seam, equator, tile border, thin outlines | `SEAM` | |
| Cut, jump, the fourth axis that cannot be drawn | `WARN` | discontinuity |
| Smooth across, agreement | `OK` | |
| Hue by angle of w | HSL(hue = Arg w / 2pi, s 0.8, l 0.5) (`arg_color`, `hsl_to_rgb`), and the domain colouring formula (`domain_rgb`) | red at Arg 0, counter-clockwise |
| Hidden real number (the colour of a surface) | `hidden_ramp(t)`, five viridis stops, t = 1/2 + hidden / (2 · 4.5) | the legend bar says `colour` |

Rule kept from STORY section 4: the hue wheel always means an angle of w; the viridis ramp always means a signed real number; the
two never appear for the other's meaning. The surfaces beat uses viridis (height u, colour v); the Riemann beat uses hue (height
Im, colour Arg of the root); the painted plane uses hue and lightness (the exact `colorXY` of the site, faint rings at |w| = 2^k).

**arg versus Arg.** The video shows the point and its address, not the staircase list (the staircase has its own video). Where an
angle appears it is **Arg**: the arc in the small w plane is the principal angle (it jumps from +180 to −180 degrees as w crosses
the negative real axis during the lap, which is the seam of Thread 2 seen from the other side) and the hue repeats every turn.

---

## 4. Module API

The module is a manim scene file, not an ES module. Its public surface is: the class `Main`, the narration file, and the pure
functions above the marker (D2).

### 4.1 Exports (names are final; signatures as in Appendix A)

Pure half (math and numpy only; importable under `python3 -I` after cutting at the marker):

```python
TAU
stereographic(re, im) -> (X, Y, Z)                  # (2x, 2y, |z|^2 - 1) / (|z|^2 + 1); infinite or huge input -> (0, 0, 1)
inverse_stereographic(X, Y, Z) -> (x, y)            # (X, Y) / (1 - Z); Z >= 1 -> (inf, inf)
rotate_uv(p, alpha) -> (x, y, h, hidden)            # p = (x, y, u, v); rotate4 with uv = alpha, yv = 0; h = u cos a - v sin a
rot_x(p, a) -> (X, Y, Z)                            # rotation about the X axis (the axis through 1 and -1); a = pi is z -> 1/z
square_fn(x, y) -> (u, v)                           # z^2 = (x^2 - y^2, 2xy)
riemann_point(r, theta, n=3, part="im") -> (x, y, h, other)   # as riemannPoint; theta unwrapped
hue_of(re, im) -> [0, 1)          lightness_of(re, im) -> [0, 1)
domain_rgb(re, im, rings=True) -> (R, G, B) ints    # js colorXY
domain_image(f, half=2.0, px=600, rings=True, mask_radius=None) -> uint8 array (px, px, 4)   # f maps a complex ndarray to a complex ndarray
HIDDEN_STOPS, hidden_ramp(t) -> (r, g, b) floats 0..1
hsl_to_rgb(h, s, l), arg_color(re, im)
side_stroke(t) -> (x, y)          side_image(t) -> (u, v)      # the stroke of the side beat and its image under z^2
circle_z(t) -> (x, y)             recip(x, y) -> (u, v)        # the circle |z - 1| = 1 from 0 back to 0; 1/z
```

Scene half: `class Main(NarratedScene, ThreeDScene)` with `narration_id = "shadows-4d"`, `construct()` calling `beat_intro`, `beat_side`,
`beat_domain`, `beat_surfaces`, `beat_riemann`, `beat_sphere`, `beat_close` in that order (one `with self.beat("<id>") as t:` each),
helpers `est`, `put_tag`, `fixed`, `clear_stage`, `snap`, `ramp_stroke`, `make_plane`, `surface_at`, and module helpers `rgb_col`,
`rgb255`, `sgn`, `cplx`, `class Clock`.

### 4.2 Data structures

- `self.segments` (NarratedScene): `{id: {id, text}}` from the JSON; `self.est(id)` = `max(MIN_BEAT_SECONDS, words / WORDS_PER_SECOND) + PAD_SECONDS`.
- `self.stage`: list of mobjects to fade out at the end of the beat; `self.snaps`: `{name: ndarray (h, w, 4)}`, filled by `snap`, read by `beat_close`.
- `Clock(scene, t, est)`: `t0` start time, `k = t / est`; `now()`, `until(sec)`, `rt(secs)`.
- The narration JSON: `{ id, title, summary, station, music: { prompt, seconds }, segments: [{ id, text }] }` (Appendix B).

### 4.3 Events and lifecycle

No events. Lifecycle of one render: `NarratedScene.setup` reads the JSON; `construct` runs the seven beats; each beat builds its mobjects,
plays them, **clears its stage and every updater it created** (`clear_updaters()`, `remove`, `remove_fixed_in_frame_mobjects`,
`remove_fixed_orientation_mobjects`); `tear_down` writes `media/video/shadows-4d.vtt`. There is no network access and no file write
other than the `.vtt` (A4 of the ch1 goal's wording). "Unmount" is the end of the process.

### 4.4 Environment

`PYTHONPATH` includes `videos/` (render.mjs sets it); manim Community 0.22.0 (`~/.venvs/manim/bin/manim`); LaTeX and `dvisvgm`;
`ffmpeg`/`ffprobe`; the default Cairo renderer (the `snap` of D8 reads the Cairo camera's `pixel_array`).

---

## 5. Algorithms

### 5.1 Time model

1. For every beat the length is `t = max(1.5, words / 2.5) + 0.35` (silent) or `clip + 0.35` (audio); `with self.beat(id) as t`.
2. `c = Clock(self, t, self.est(id))` at the top of the block; `k = t / est` (exactly 1 in a silent render).
3. `c.until(sec)`: `d = (sec - (renderer.time - t0) / k) * k`; if `d >= 1 / frame_rate`, `self.wait(d)`; else nothing. `wait(0)` raises `ValueError` in manim, which is why a guard is mandatory.
4. `c.rt(secs) = max(secs * k, 1 / frame_rate)`: the `run_time` of an animation that starts at a cue and must end before the next one.
5. Fixed durations that do not scale: the 0.4 s cut-in and the 0.3 s fade-out.
6. The last action of every beat but the last is `c.until(est - 0.45); self.clear_stage()` (0.3 s), leaving 0.15 s of empty frame. `close` ends with `c.until(est - 0.1)` and keeps its last frame.

Rendered times are multiples of 1/15 s (480p15) or 1/30 s; the cue starts measured on the prototype are 0, 20.733, 44.667, 68.2, 86.933, 109.667, 132.733 (estimates 0, 20.75, 44.70, 68.25, 87.00, 109.75, 133.30, quantised).

### 5.2 Beat skeleton and shared helpers

```
construct():
  camera.background_color = BG;  camera.should_apply_shading = False
  set_camera_orientation(phi=0, theta=-90 deg)          # a ThreeDScene at this orientation draws flat things as a 2D scene does
  beat_intro(); beat_side(); beat_domain(); beat_surfaces(); beat_riemann(); beat_sphere(); beat_close()

put_tag(text):  new = Text(text, 24, MUTED) at the top-left corner; remove the previous tag (and its fixed flag); add_fixed_in_frame(new)
fixed(*mobs):   add_fixed_in_frame_mobjects(*mobs); remove(*mobs)       # flag them; FadeIn shows them later. Needed for EVERY 2D overlay
                                                                        # (captions, legends, insets) in a beat whose camera is tilted
clear_stage(run_time=0.3): play(FadeOut(m) for m in stage); remove them; remove_fixed_in_frame/orientation; stage = []
snap(name, box):  arr = renderer.camera.pixel_array (copy); crop the box (scene units -> pixels: px = (x + fw/2)/fw * W, py = (fh/2 - y)/fh * H);
                  store in self.snaps[name]
ramp_stroke(pts, base, width, opacity): n short Lines; segment i coloured ramp(base, (i + 0.5)/n)
make_plane(center, side, rx, ry): NumberPlane (grid MUTED 28 percent, axes MUTED), moved to center, unit squares
```

Rules each beat obeys (each one was a bug in the prototype):
1. Open composed (D7); `self.stage` lists everything to fade at the end.
2. `add_updater` does **not** call the updater by default: put an updater-driven mobject at its start position when you create it (the first still showed the clock ring at the frame centre).
3. Anything with `always_redraw` that must be a 2D overlay in a tilted scene: the instance is flagged with `add_fixed_in_frame_mobjects` (the redraw does `become`, so the flag stays).
4. After an `always_redraw` phase call `clear_updaters()` on each, then `FadeOut` or `remove`. A beat with updaters left on redraws every frame in every later hold.
5. Never `wait` or `play` with a duration below one frame.
6. Heavy 3D (`Surface`, `Sphere`, `Dot3D`) is dynamic only during a turn, a walker or a half-turn; holds are static frames (a held beat costs almost nothing).

### 5.3 Beat tables (seconds of the silent estimate; the phrase that is being spoken is quoted)

**intro** (est 20.75)

| Time | Action |
|---|---|
| 0.0 | tag; title `w = f(z)` (MathTex, scale 1.5) fades in over 0.6 s |
| 0.6 | planes z (range ±2) and w (±4), arrow `f`, letters `x y u v` and `z`, `w` fade in (0.8 s) |
| 3.0 | dots z0 = 1 + i (INPUT) and w0 = 2i (OUTPUT) |
| 4.4, 5.8 | chips `x = 1`, `y = 1` ("x and y for where z sits") |
| 7.2, 8.6 | chips `u = 0`, `v = 2` ("u and v for where w lands") |
| 9.3 | brace and `four numbers` |
| 10.0 | "Nobody can draw four dimensions": planes, dots and brace fade; chips move up to y = 2.0; three solid CART arrows `x y u` and a dashed WARN fourth `v ?` appear |
| 12.0 | arrows fade; five boxes (2.6 x 1.3, number above name) fade in at 12.6, 13.8, 15.0, 16.2, 17.4 with a fan line each |
| 19.2 | "Here are five.": the boxes grow 6 percent and back (0.3 s each) |
| 20.3 | clear |

**side** (est 23.95)

| Time | Action |
|---|---|
| 0.0 to 0.4 | the picture, whole: planes (4.8 square at x = ∓3.8, y = 0.35; z range ±2, w range ±4), the two ramped strokes (40 segments), five dots at t = 0 .. 1 with labels, arrow `f`, `t: 0 → 1`, rings at t = 0 |
| 3.6 to 9.6 | ring on both planes runs t = 0 to 1, linear ("Draw a stroke ... point for point") |
| 10.8 to 15.2 | ring visits t = 0, ¼, ½, ¾, 1, 0.9 s apart ("matching dots match in time") |
| 15.2 to 15.6 | ring to t = ¼; snapshot `side` (box −6.5, −2.3, 6.5, 3.4) |
| 15.6 | the pair shrinks to 0.8 about (0, 3.0) (0.5 s); two discs (radius 1.1, centres (∓2.9, −2.65)) with a small square at z0 = 1 − 0.7i (INPUT) and its exact image under z² (OUTPUT, 8 points per edge), `up close:` |
| 19.6 | an arrow of z-length 0.2 along +x in the left disc and its image f'(z0)·0.2 in the right disc ("turned and stretched") |
| 21.4 | `f'(z) = 2z` and `stretch 2.44, turn −35°` |
| 23.5 | clear |

**domain** (est 23.55)

| Time | Action |
|---|---|
| 0.0 to 0.4 | the painted plane (600 px image of z² on [−2, 2]², 4.8 units square at (−4.2, −0.1)), frame, axes, `x`, `y`, `z` |
| 0.8 | `place: x, y` (CART) `colour: w` (OUTPUT) under the plane |
| 5.6 | probe at z0 = 1 + 0.5i with two dashed CART drop lines, readout line 1 (CART): `z = 1.00 + 0.50i    Cartesian: x = 1.00, y = 0.50` ("Where you stand is the Cartesian address of z") |
| 9.2 | the small w plane (3.0 square, range ±2, at (0.3, 1.2)) with `w = z²`, the ray and the arc (POLAR) and the dot coloured as the plane under the probe; the colour wheel (`domain_image(z -> z)` masked to a disc, 1.5 across, at (2.6, 1.7)); readout line 2 (POLAR): `w = 0.75 + 1.00i    polar: r = 1.25, θ = 53.1°` ("the polar address of w") |
| 12.8 | `hue: its angle` brightens ("hue is its angle") |
| 14.4 | `brightness: its length` brightens |
| 16.0 | key `red: w on the positive real axis` (swatch = the site's colour of w = 1) and a dashed white line along the real axis ("Red means along the positive real axis") |
| 18.8 | key `black: w = 0` and a ring at the origin ("black means zero") |
| 20.0 to 23.0 | the probe goes once round at \|z\| = 1.2 (tracker phi from 26.57 degrees to 386.57 degrees, radius 1.118 to 1.2) while the w dot goes twice round ("the colours go round twice"); snapshot `domain` at the end |
| 23.1 | clear |

**surfaces** (est 18.75)

| Time | Action |
|---|---|
| 0.0 to 0.4 | camera phi 58, theta −60 degrees (set before the fade, nothing is on screen); the real surface (z²: height u, 20 x 20 faces over [−1.5, 1.5]², screen scale x, y by 1.5, height by 0.36), a faint 7 x 7 floor grid at height −1.85, labels `real surface` / `height u, colour v`, the viridis bar |
| 3.2 to 3.5 | turn 0 to −7.5 degrees while the labels cross-fade to `real → imaginary` / `turning in the u–v plane` |
| 3.5 to 6.5 | turn −7.5 to −82.5 (linear, 25 degrees per second) |
| 6.5 to 6.8 | turn to −90 while the labels cross-fade to `imaginary surface` / `height v, colour −u`; snapshot `surfaces` (box −3.4, −3.0, 3.4, 3.0) |
| 12.8 to 15.6 | the turn back to 0 (0.3 s fade to `real → imaginary`, 2.2 s of turn, 0.3 s to `real surface`): "it trades places with the height" |
| 15.6 to 18.1 | camera theta −60 to −30 degrees ("seen from a new side") |
| 18.3 | clear |

**riemann** (est 22.75)

| Time | Action |
|---|---|
| 0.0 to 0.4 | camera phi 68, theta −58; the two `Surface` objects (sheet 0: theta 0 to 2pi, 10 x 18 faces; sheets 1 and 2: 2pi to 6pi, 10 x 36), hue per face = theta_mid / 6pi, opacity 0.9; labels `height: Im of the cube root` / `colour: angle of the root` |
| 1.6 to 5.2 | a floor point (CART) at z0 = e^(iπ/3) and a dashed vertical; at 3.0, 3.6, 4.2 the three dots on the three sheets (heights 0.342, 0.643, −0.985 before the screen scale) with labels `w1 w2 w3`; snapshot `riemann` right after the third dot (about 4.5 s) |
| 5.2 to 7.6 | "this surface holds all three": hold |
| 7.6 | the dots and the line fade |
| 7.9 to 14.4 | the walker: theta from 0 to 6pi (linear) at r = 1: white dot, white trail, blue floor dot with a dashed drop line, label `lap 1 of 3` (then 2, 3), while the camera theta goes −58 to −35 degrees |
| 14.4 | sheets 1 and 2 fade to opacity 0.1 (0.8 s) ("A branch is one sheet") |
| 16.4 | the cut: the two edges of sheet 0 over the positive real axis (WARN) and the dashed jump between them at r = 1.8; `the cut: positive real axis` ("cut along the positive real axis") |
| 18.8 | the curve on the negative real axis (theta = pi, OK, width 6), `negative real axis: smooth` |
| 20.4 | the formula `f(z) = r^(1/3) e^(iθ/3), 0 < θ < 2π` |
| 22.3 | clear |

**sphere** (est 23.55)

| Time | Action |
|---|---|
| 0.0 to 0.4 | camera phi 68, theta −30; sphere (radius 2, 16 x 32 faces, SURFACE at 35 percent, MUTED mesh at 50 percent), equator, poles with labels `∞` (north) and `0` (south, fixed-orientation text), the circle \|z − 1\| = 1 stereographically projected (48 segments, ramped INPUT) with four dots at t = 0, ¼, ½, ¾ |
| 0.8 to 5.2 | a white dot travels the meridian from the south pole towards the north pole (colatitude phi 0.02 to 3.1, smooth), with the live text `z = <tan(phi/2), one decimal>` (0.0 growing to 8.2) then `z → ∞` once phi >= 2.9 ("infinity becomes one point, the north pole") |
| 6.4 | the dot fades; the plane inset (range x −1 to 3, y −2 to 2, 3.2 square, at (4.9, 0.4)) with `\|z − 1\| = 1`, the circle and its four dots |
| 9.6 | the south pole pulses ("lands on a circle through the south pole") |
| 12.8 | the dashed axis through ±1 with labels `1` and `−1` (0.8 s); the circle becomes a ghost at 35 percent opacity |
| 14.0 to 18.0 | the half-turn: a copy of the circle (and its dots) rotates by `s·pi` about the X axis, base colour mixed INPUT to OUTPUT by s ("a half-turn about the axis"); snapshot `sphere` at 18.0 |
| 18.8 | `1/z swaps 0 and ∞` |
| 20.4 | in the inset the line Re w = ½ (OUTPUT, double arrowhead from y = −1.9 to 1.9), `∞` at both ends, the dots at (½, ½), (½, 0), (½, −½) for t = ¼, ½, ¾, label `Re w = ½` ("the circle opens into a line") |
| 23.1 | clear |

**close** (est 19.55)

| Time | Action |
|---|---|
| 0.0 to 0.4 | camera back to phi 0, theta −90; five tiles (widths 3.5, 2.1, 2.1, 2.1, 2.1, height 2.3, 0.18 apart, centred at y = −0.5) holding the snapshots scaled to fit, names under them; the object at y = 2.9; five fan lines |
| 2.4, 4.8, 6.0, 8.0, 8.8 | tile 1, 2, 3, 4, 5 get a white 4-pt border in turn, the others back to SEAM ("Two planes tied by a clock, a painted plane, the real and imaginary surfaces, the staircase, the sphere") |
| 9.6 | tile 1 alone; caption `a question about the image of a shape: read this one` |
| 15.6 | all five bordered white, fan lines white, caption `turn the object, and all five are there` ("Turn the object, and you can see the others") |
| 19.45 | end (no fade) |

### 5.4 Domain colouring (the site's `colorXY`, vectorised)

For each pixel (x, y) of a `px x px` grid over [−half, half]² (rows run from +half at the top to −half at the bottom, so the image is
upright): `W = f(x + iy)`; `m = |W|`; `l = 1 − 1/(1 + sqrt m)`; with rings, `l *= 0.88 + 0.12·frac(log2 m)` (m = 0 uses log2 of 1);
`h = (arg W / 2pi) mod 1`; `a = 0.8·min(l, 1 − l)`; for n in (0, 8, 4): `k = (n + 12h) mod 12`,
`channel = l − a·max(−1, min(k − 3, 9 − k, 1))`; round with `floor(255 c + 0.5)`; pixels with m = 0 are (0, 0, 0). Alpha 255, or 0 outside
`mask_radius` for the wheel. The scalar `domain_rgb` is the same formula and equals `colorXY` (Appendix C). The wheel is the same image of
f(z) = z masked to |z| ≤ 2, so hue is the angle and lightness the radius, as `drawColorWheel` does.

### 5.5 The real and imaginary surfaces (`surface_at(alpha, n = 20)`)

1. `func(x, y)`: `(u, v) = square_fn(x, y)`; `h = rotate_uv((x, y, u, v), alpha)[2]`; return `(1.5 x, 1.5 y, 0.36 h)`.
2. `Surface(func, u_range = v_range = [−1.5, 1.5], resolution = (n, n), fill_opacity = 1, checkerboard_colors = False, stroke_color = BG, stroke_width = 0.4)`.
3. For each face in `surface.list_of_faces` (manim keeps `u1, u2, v1, v2`): midpoint `(xm, ym) = ((u1 + u2)/2, (v1 + v2)/2)`; `hidden = rotate_uv((xm, ym, u, v), alpha)[3]`; `face.set_fill(hidden_ramp(0.5 + 0.5·hidden / 4.5), 1)`. 4.5 is the largest |w| on the patch (|(1.5 + 1.5i)²| = 4.5), so the colour scale holds under every rotation (the site's "automatic hidden scale").
4. During a turn: `UpdateFromAlphaFunc(surface, lambda m, a: m.become(surface_at(radians(a0 + (a1 − a0)·a))), rate_func = linear)`; the label animations ride in the same `play`.

### 5.6 The Riemann surface

`P(r, theta) = (1.5 x, 1.5 y, 1.35 h)` with `(x, y, h, _) = riemann_point(r, theta, 3, "im")` (1.5 is the plane scale, 1.35 a vertical exaggeration that is screen-only).
`sheet(v0, v1, res_v) = Surface(lambda s, th: P(s³, th), u_range = [0, 1.8^(1/3)], v_range = [v0, v1], resolution = (10, res_v), fill_opacity = 0.9, ...)`
and each face is filled `hsl_to_rgb(theta_mid / 6pi, 0.8, 0.5)`. Walker: `P(1, th)`, floor point `P(1, th)·(1, 1, 0)`, trail
`ParametricFunction(a -> P(1, a), t_range = [0, th])`, label `lap = min(3, int(th / 2pi) + 1)`. Cut edges: `P(s³, 0)` and `P(s³, 2pi)` for s in [0, 1.8^(1/3)]; jump `DashedLine(P(1.8, 0), P(1.8, 2pi))`; negative real axis `P(s³, pi)`.

### 5.7 The sphere

1. Sphere point of z: `stereographic(re, im)`; drawn at radius 2 · 1.012 (so curves sit just above the faces).
2. The circle: `circle_z(t) = (1 − cos 2pi t, −sin 2pi t)` (z(t) = 1 + e^{i(pi + 2 pi t)}), t = i/48; points `rot_x(stereographic(circle_z(t)), a) · 2.024`.
3. The half-turn is `a = s·pi`, s from 0 to 1 (smooth); at s = 1 the point of t is `stereographic(1/z(t))` (tested).
4. The meridian traveller: `(sin phi, 0, −cos phi)·2.04`; its z is `tan(phi/2)` (tested: `stereographic(tan(phi/2), 0) = (sin phi, 0, −cos phi)`).
5. Labels (`∞`, `0`, `1`, `−1`) are `MathTex` added with `add_fixed_orientation_mobjects` so they face the camera.
6. Depth: curves are cut into 48 short `Line`s so each is sorted by its own depth (a single closed `VMobject` is sorted by its centre, which lies inside the sphere and would be hidden); the sphere is translucent so nothing is lost to the painter's sort.

### 5.8 Snapshots and the closing tiles

`snap(name, box)` crops `renderer.camera.pixel_array`. Boxes (scene units): side (−6.5, −2.3, 6.5, 3.4); domain (−6.8, −2.7, −1.6, 2.5);
surfaces, riemann, sphere (−3.4, −3.0, 3.4, 3.0). These exclude the tag (y > 3.5), the right-hand captions (x > 3.6) and the bottom captions.
`beat_close` builds a `Group(RoundedRectangle, ImageMobject, Text)` per tile; the image is scaled to fit the tile (width `w − 0.2` or height 2.1, whichever binds).

### 5.9 Re-deriving the cue table after a narration edit

The cue times in 5.3 are word positions in the segment text divided by 2.5. If the text changes, recompute them and update the
`c.until(...)` calls in Appendix A; the unit test pins the word counts (51, 59, 58, 46, 56, 58, 48) so an edit is noticed. Helper (run in a scratch shell):

```python
import json
d = json.load(open("media/narration/videos/shadows-4d.json"))
for s in d["segments"]:
    w = s["text"].split()
    print("==", s["id"], len(w), "est", round(max(1.5, len(w) / 2.5) + 0.35, 2))
    for i, x in enumerate(w):
        if i == 0 or w[i - 1][-1] in ".:;,":
            print(f"{i / 2.5:5.1f}s", " ".join(w[i:i + 6]))
```

### 5.10 Resolution management and performance

- Raster images: the painted plane is generated at 600 x 600 (432 px on screen at 720p, 288 at 480p: always downsampled, never blocky); the wheel at 300 x 300 for 1.5 units. Both are RGBA `uint8` `ImageMobject`s.
- Snapshots are cut from the frame, so a 720p render gives sharper tiles than 480p automatically.
- 3D cost: at most 400 faces (`Surface`), 540 (Riemann), about 500 (sphere), rebuilt per frame only while a turn or a walker is running (about 28 s of the 152 s). Measured: 480p15 render 2 min 19 s wall; 720p30 5 min 49 s.
- Keep `should_apply_shading = False` (also cheaper), no ambient camera rotation, no `always_redraw` in holds (5.2 rule 4).

---

## 6. Mathematics

Every number here was recomputed with the reference implementation and is a unit-test expectation (7.1). Angles in radians unless marked; "Arg" is the principal value in (−pi, pi].

### 6.1 Problem 2.5.1: the image of |z − 1| = 1 under w = 1/z

**Cartesian (slide) view.** z = x + iy on the circle: (x − 1)² + y² = 1, i.e. x² + y² = 2x. Then
w = 1/z = (x − iy)/(x² + y²), so u = x/(x² + y²) = x/(2x) = **1/2** (for x ≠ 0), and v = −y/(2x), which takes every real value as z goes round (as x → 0, y/x → ±∞). The image is the line **Re w = 1/2**; z = 0 (x = 0) goes to infinity.
Hand checks: z = 2 gives w = 1/2 (u = 1/2, v = 0); z = 1 + i gives (1 − i)/2 = (1/2, −1/2); z = 1 − i gives (1/2, +1/2).

**Polar (move) view.** On the circle z = 2 cos θ · e^{iθ} with θ = Arg z in (−pi/2, pi/2) (the circle through 0 with centre 1). Then
w = 1/z = (1/(2 cos θ)) e^{−iθ} = (1/(2 cos θ))(cos θ − i sin θ) = **1/2 − (i/2) tan θ**: the real part is constant, the imaginary part runs over all reals as θ → ±pi/2. In the video's clock: z(t) = 1 + e^{i(pi + 2 pi t)} = 2 sin(pi t) · e^{i(pi t − pi/2)}, so 1/z = 1/2 + (i/2) cot(pi t); t = 1/4, 1/2, 3/4 give (1/2, 1/2), (1/2, 0), (1/2, −1/2) (the dots in the inset).

**On the sphere.** `stereographic(z) = (2x, 2y, |z|² − 1)/(|z|² + 1)`. On the circle |z|² = 2x, so X = 2x/(2x + 1), Z = (2x − 1)/(2x + 1) and **Z = 2X − 1**: the circle lies in a plane through the south pole (0, 0, −1). The half-turn about the X axis (the axis through z = 1, (1, 0, 0), and z = −1) is (X, Y, Z) → (X, −Y, −Z), and equals z → 1/z (tested at z = 2 + i: (2/3, −1/3, −2/3) both ways). The image plane is Z = 1 − 2X, which contains the north pole (0, 0, 1) = infinity; a circle through the north pole projects to a line, and (X, Y)/(1 − Z) = (X, Y)/(2X) has u = **1/2**. Polar form of the half-turn: z = r e^{iθ} sits at longitude θ and colatitude from the south pole ψ with r = tan(ψ/2); 1/z = (1/r) e^{−iθ} has longitude −θ and ψ' = 2 arctan(1/r) = pi − ψ. "Invert the length, mirror the angle" is "swap the hemispheres, flip the longitude", which is the half-turn about the X axis.

| t | z (x, y) | sphere (X, Y, Z) | after the half-turn | 1/z (u, v) |
|---|---|---|---|---|
| 0 | (0, 0) | (0, 0, −1) | (0, 0, 1) = north pole | infinity |
| 1/4 | (1, −1) | (2/3, −2/3, 1/3) | (2/3, 2/3, −1/3) | (1/2, 1/2) |
| 1/2 | (2, 0) | (4/5, 0, 3/5) | (4/5, 0, −3/5) | (1/2, 0) |
| 3/4 | (1, 1) | (2/3, 2/3, 1/3) | (2/3, −2/3, −1/3) | (1/2, −1/2) |

### 6.2 Problem 2.4.1: a branch of z^(1/3) continuous on the negative real axis

**Polar (move) view.** z = r e^{iθ}. A branch chooses one name θ for each z: f(z) = r^(1/3) e^{iθ/3}. Take **0 < θ < 2π** (the seam, the cut, is the positive real axis). At z = −r, θ = π whether you arrive from above or below (π is inside the window), so f(−r) = r^(1/3) e^{iπ/3} = r^(1/3)(1/2 + i√3/2) from both sides: continuous. At z = −1: f = 1/2 + (√3/2) i, and f³ = e^{iπ} = −1. Across the positive real axis the value jumps from r^(1/3) (θ → 0⁺) to r^(1/3) e^{2πi/3} (θ → 2π⁻), a difference of modulus 2 sin(π/3) r^(1/3) = √3 r^(1/3); in the picture the height Im f jumps by r^(1/3) sin(2π/3). For r = 1.8: r^(1/3) = 1.2164, the jump in Im is **1.0535**, and Im f at θ = π is also **1.0535** (equal: sin(2π/3) = sin(π/3)), which is why the edge over the positive axis at θ = 2π sits at the same height as the curve over the negative axis.
The principal branch (window −π < θ ≤ π) is discontinuous on the negative axis: z = −1 gives e^{iπ/3} from above and e^{−iπ/3} from below (`principalJumps` in the site's data).

**Cartesian (slide) view.** With r = √(x² + y²) and θ = atan2(y, x), plus 2π when y < 0 (so θ lies in [0, 2π)): Re f = r^(1/3) cos(θ/3), Im f = r^(1/3) sin(θ/3). There is no shorter closed form in (x, y) (the site's data has `cart: null` for cbrt). On the negative real axis (y = 0, x < 0): θ = π, Re f = r^(1/3)/2, Im f = (√3/2) r^(1/3).

**The three values above one point** (the pierce line of the video): z0 = e^{iπ/3} (r = 1, θ = 60°); the cube roots are e^{i(π/3 + 2πk)/3} at 20°, 140°, 260°; their imaginary parts (the heights) are sin 20° = **0.3420201**, sin 140° = **0.6427876**, sin 260° = **−0.9848078**; they sum to 0, and each cubed is e^{iπ/3} (3·20° = 60°, 3·140° = 420° = 60°, 3·260° = 780° = 60°). The surface closes after 3 laps: `riemann_point(1, 6pi) = riemann_point(1, 0) = (1, 0, 0, 1)`, while one lap (theta + 2pi) changes the point.

### 6.3 T3.1: the derivative as "one move up close" (the side beat's magnifier)

f(z) = z², z0 = z(t = 1/4) = 1 − 0.7i, w0 = z0² = 0.51 − 1.4i. **Cartesian:** u = x² − y², v = 2xy, so f'(z0) = u_x + i v_x = 2x + 2iy = **2 − 1.4i**. **Polar:** |f'| = √(4 + 1.96) = √5.96 = **2.4413** (printed 2.44), Arg f' = atan2(−1.4, 2) = **−34.99°** = −0.6107 rad (printed −35°). A tiny square around z0 (half-side 0.1) is carried to a figure that is that square turned by Arg f' and stretched by |f'| plus a second-order wobble: (z0 + h)² = z0² + 2 z0 h + h², and at a corner |h| = 0.1414 the wobble |h|² = 0.02 is 0.02/(2.44·0.1414) = 5.8 percent of the move, visible only as slightly curved edges. The east arrow of length 0.2 goes to 0.2·f'(z0) = 0.4 − 0.28i, i.e. 0.49 long at −35° (drawn at magnification 2).

### 6.4 The side beat (w = z² along the stroke z(t) = 1 + i(−1.4 + 2.8 t))

**Cartesian:** y = −1.4 + 2.8 t, z² = (1 − y²) + 2iy, so (u, v) = (1 − y², 2y): a parabola u = 1 − v²/4 (vertex 1, opening left). **Polar:** z = √(1 + y²) e^{i atan y}, so w = (1 + y²) e^{2i atan y}: the length is squared, the angle doubled.

| t | y | z | w = z² Cartesian | w polar (r, Arg) |
|---|---|---|---|---|
| 0 | −1.4 | 1 − 1.4i | −0.96 − 2.8i | (2.96, −108.9°) |
| 1/4 | −0.7 | 1 − 0.7i | 0.51 − 1.4i | (1.49, −70.0°) |
| 1/2 | 0 | 1 | 1 | (1, 0) |
| 3/4 | 0.7 | 1 + 0.7i | 0.51 + 1.4i | (1.49, 70.0°) |
| 1 | 1.4 | 1 + 1.4i | −0.96 + 2.8i | (2.96, 108.9°) |

(0.7: Arg z = 34.99°, doubled 69.98°; 1.4: Arg z = 54.46°, doubled 108.92°; cos 108.92° = −0.3243, 2.96·(−0.3243) = −0.960, 2.96·sin = 2.800.)

### 6.5 The domain beat (w = z² painted on the z plane)

Probe z = 1 + 0.5i. **Cartesian:** (x, y) = (1, 0.5); w = (x² − y², 2xy) = (0.75, 1.00). **Polar:** |z| = 1.1180, Arg z = 26.565°; w = |z|² e^{2 i Arg z} = 1.25 e^{i 53.13°}. The colour there is `domain_rgb(0.75, 1.0)` = **(223, 200, 25)**, a yellow (hue 53.13/360 = 0.148, lightness (1 − 1/(1 + √1.25))·ring). Along the lap at |z| = 1.2, w = 1.44 e^{2iφ}: the length (hence brightness) is constant and the hue goes round twice while φ goes round once. Landmarks: z = ±1 (and any real z) gives w > 0, red `(202, 22, 22)`; z = ±i gives w = −1, cyan `(22, 202, 202)`; z = 0 black; z = 2 (w = 4) `(234, 65, 65)`, lighter and still red; z = 1 + i (w = 2i) `(131, 230, 33)`.

### 6.6 The surfaces beat (the u–v rotation)

The graph of z² is (x, y, u, v) = (x, y, x² − y², 2xy). `rotate_uv(p, a) = (x, y, u cos a − v sin a, u sin a + v cos a)` is `rotate4` with uv = a. Height h(a) = u cos a − v sin a and colour = hidden(a) = u sin a + v cos a; both stay within ±|w|, so the colour scale 4.5 (the largest |w| on [−1.5, 1.5]²) is valid at every a. a = 0: (x, y, u, v), the real surface. a = −pi/2: (x, y, v, −u), the imaginary surface with colour −u. At (x, y) = (1, 1/2): (u, v) = (3/4, 1); a = −pi/2 gives height 1 and hidden −3/4 (the test value); a = +pi/2 gives height −1 and hidden 3/4 (what `rotate4(p, {uv: π/2})` returns for p = (1, 0.5, 0.75, 1), matching `-v, u`). The two surfaces are one saddle turned by 45 degrees about the vertical axis (z² = r² e^{2iθ}: u = r² cos 2θ, v = r² sin 2θ).

---

## 7. Verification plan

### 7.1 Unit test: `tests/unit/i2-videos-4d.test.mjs` (A2, plus the maths of A4)

No manim needed; the cases that run Python skip (with a reason) when `python3` or `numpy` is missing; the render-dependent cases skip when `media/video/shadows-4d.mp4` does not exist.

```js
import { spawnSync } from 'node:child_process';
const SENTINEL = '# ---- scene: manim below this line';
const src = fs.readFileSync('videos/scenes/shadows-4d.py', 'utf8');
const cut = src.indexOf('\n' + SENTINEL);            // must exist, and appear once
const pure = src.slice(0, cut);
const r = spawnSync('python3', ['-I', '-c', pure + '\n' + tail], { encoding: 'utf8' });   // tail prints json.dumps(results)
```

| Id | Case | Expected |
|---|---|---|
| U1 | beat ids: every `self.beat("...")` in the file, in order of appearance | equals the 7 JSON segment ids `intro side domain surfaces riemann sphere close`, each once |
| U2 | JSON fields | `id` is `shadows-4d`; `title` non-empty; `summary` >= 40 chars; `station` is `graph4d`; `music.prompt` >= 20 chars; `music.seconds` 20 to 40; 7 segments with ids matching `/^[a-z0-9-]+$/` |
| U3 | word counts | total 300 to 450 (is 376); each segment 12 to 60; pinned: `[51, 59, 58, 46, 56, 58, 48]` |
| U4 | phrases (lower-cased joined text) | contains `four numbers`, `shadow`, `hue`, `brightness`, `real surface`, `imaginary surface`, `half-turn`, `infinity`, `five pictures, one object`, `cartesian`, `polar`; contains no `$` and no backslash |
| U5 | source rules | no match of `/#[0-9a-fA-F]{6}/`; a line `from lib.palette import`; `class Main(NarratedScene`; contains `ThreeDScene`; `self.camera.should_apply_shading = False`; the marker occurs once; the pure half has no line matching `/^\s*(import\|from)\s+(manim\|lib)\b/m` |
| U6 | colour: `domain_rgb` vs `colorXY` from `js/core/domaincolor.js` | identical integers at the 11 points of Appendix C, both ring modes; `domain_rgb(1, 0)` = (202, 22, 22), without rings (230, 25, 25); `domain_rgb(0, 0)` = (0, 0, 0); `hue_of` at 1, i, −1, −i = 0, 0.25, 0.5, 0.75; `lightness_of(0)` = 0, `(1)` = 0.5, `(100)` = 10/11 |
| U7 | `domain_image(lambda z: z*z, 2.0, 600)` | shape (600, 600, 4), `uint8`; pixel [300, 500] red (R > 200, G < 90, B < 90, A = 255) = (233, 54, 55, 255); [100, 300] cyan (53, 233, 232); [299, 299] dark (each of R, G, B < 30); `domain_image(z -> z, 2.0, 300, mask_radius=2.0)`: alpha 0 at [0, 0], 255 at [150, 150] |
| U8 | stereographic | (0, 0) → (0, 0, −1); (1, 0) → (1, 0, 0); (0, 1) → (0, 1, 0); (2, 1) → (2/3, 1/3, 2/3) equal to `stereographic({re: 2, im: 1})` from `three-view.js` (1e-9); (1e9, 0) within 1e-8 of (0, 0, 1); infinite input (0, 0, 1); `inverse_stereographic` of (2 + i) round-trips (1e-12) |
| U9 | half-turn identity (A4, 2.5.1) | `rot_x(stereographic(2, 1), pi)` = `stereographic(*recip(2, 1))` = (2/3, −1/3, −2/3) within 1e-12 |
| U10 | circle and image | `circle_z` at t = 0, 1/4, 1/2, 3/4, 1 = (0, 0), (1, −1), (2, 0), (1, 1), (0, 0) (1e-12); `recip(*circle_z(t))[0]` = 0.5 for t in 0.1, 0.25, 0.4, 0.6, 0.75, 0.9 (1e-12) |
| U11 | rotation (A4) | `rotate_uv((1, .5, .75, 1), pi/2)` = `rotate4([1, .5, .75, 1], {uv: π/2})` from `three-view.js` = (1, .5, −1, .75); at −pi/2 = (1, .5, 1, −.75); at 0 the input; `rotate_uv((1, .5) + square_fn(1, .5), -pi/2)` = (1, .5, 1.0, −0.75) |
| U12 | Riemann (A4, 2.4.1) | `riemann_point(1, pi/3)` equals `riemannPoint({n: 3, part: 'im'}, 1, π/3)` = (0.5, 0.8660254, 0.3420201, 0.9396926) (1e-12); heights over z0 for theta + 2 pi k, k = 0, 1, 2 = 0.3420201433, 0.6427876097, −0.9848077530, sum 0; `riemann_point(1, 6pi)` = `riemann_point(1, 0)` (1e-12); for r = 1.8: heights at theta = 0, 2 pi, pi = 0, 1.0534683, 1.0534683 (= 1.8^(1/3) sin(pi/3)) |
| U13 | colours | `hidden_ramp(0)`, `(0.5)`, `(1)` equal `hiddenRamp` from `three-view.js` (1e-12) = (68, 1, 84)/255, (33, 145, 140)/255, (253, 231, 37)/255; `HIDDEN_STOPS` equals `HIDDEN_RAMP_STOPS`; `arg_color(1, 0)` = `argColor` = (0.9, 0.1, 0.1); `arg_color(−1, ±1e-12)` equal within 1e-9 |
| U14 | side stroke (6.3, 6.4) | `side_stroke`/`side_image` at t = 0, 1/4, 1/2, 3/4, 1: (1, −1.4)→(−0.96, −2.8); (1, −0.7)→(0.51, −1.4); (1, 0)→(1, 0); (1, 0.7)→(0.51, 1.4); (1, 1.4)→(−0.96, 2.8) (1e-12); `abs(2·z0)` = 2.4413111 and `degrees(atan2(−1.4, 2))` = −34.992 so the on-screen strings `2.44` and `−35` are right |
| U15 | formatting (scene half cannot be imported, so assert the strings in the source) | the source contains `"stretch 2.44, turn −35°"` and the readout formats `cplx(`, `polar: r =` |
| U16 | render outputs (skipped without the render) | `media/video/shadows-4d.vtt` has 7 cues whose texts equal the JSON texts in order; `ffprobe` duration between 120 and 180 (expected 152.85 ± 1); `media/manifest.js` lists `shadows-4d` with `station: 'graph4d'` and a `captions` path; file size of the −ql mp4 under 4 000 000 bytes or of the −qm mp4 under 15 000 000 |

Run: `node --test tests/unit/i2-videos-4d.test.mjs` and `npm test` (the file must not turn any green test red; the only repo files it reads are listed above).

### 7.2 Per acceptance criterion

| Id | Command or steps | What passing looks like |
|---|---|---|
| **A1** smoke | `node tools/videos/render.mjs --only shadows-4d --quality l` (2.5 min); then `ls -l media/video/shadows-4d.mp4 media/video/shadows-4d.vtt`; `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 media/video/shadows-4d.mp4`; `grep -c -- '-->' media/video/shadows-4d.vtt`; `grep -n -A3 shadows-4d media/manifest.js`; once at the end `node tools/videos/render.mjs --only shadows-4d --quality m` (6 min) and `stat -c %s media/video/shadows-4d.mp4` | exit 0; both files exist; duration 151.7 to 153.7 (limit 120 to 180); `7`; the manifest entry has `station: 'graph4d'` and `captions: 'media/video/shadows-4d.vtt'`; the −ql file is 3.5 MB (under the 4 MB fallback) and the −qm file 6.2 MB (under 15 MB). Run the −qm last so `media/video/shadows-4d.mp4` is the deliverable. |
| **A2** unit test | `node --test tests/unit/i2-videos-4d.test.mjs` | U1 to U5 and U16 green; Appendix B text is the file. |
| **A3** screenshot review | For each cue start `s` read from the `.vtt`: `mkdir -p docs/review/iter-2/i2-videos-4d && ffmpeg -y -v error -ss <s+0.5> -i media/video/shadows-4d.mp4 -frames:v 1 docs/review/iter-2/i2-videos-4d/shadows-4d-<beat>.png` for `intro side domain surfaces riemann sphere close`, plus `-ss <s_surfaces+4.5>` saved as `shadows-4d-surfaces-4s.png`; read the images | `side`: two planes, a teal stroke with five dots and a pink parabola with the same five dots, labels `0 ¼ ½ ¾ 1`, a ring at t = 0 on both. `domain`: a painted plane, red along the real axis, cyan along the imaginary axis, black at the centre, faint rings. `surfaces`: a saddle on a floor grid, label `real surface`; and the 4.5 s still: the same surface visibly turned (about 32 degrees), label `real → imaginary` with `turning in the u–v plane`. `riemann`: three hue-coloured sheets meeting at the centre. `sphere`: a sphere with a teal circle through its south pole and `∞` at the north pole. `close`: five tiles in a row, names under them, the object above. Background `BG` (dark) in every still. (Compare the nine reviewed stills of the design run.) |
| **A4** code inspection | `grep -n "def rotate_uv" -A4`, `"def stereographic"`, `"def riemann_point"`, `"def domain_rgb"`, `"def hidden_ramp"`; plus U6 to U13 | `rotate_uv` is `u cos a − v sin a`, `u sin a + v cos a` and equals `rotate4`; the quarter turn runs `0 → −90` degrees (`turn(0, -7.5 ...)` to `turn(..., -90 ...)`); `stereographic` is `(2x, 2y, \|z\|² − 1)/(\|z\|² + 1)` with the pole for infinity; the Riemann surface is `riemann_point(s ** 3, theta)` for theta in [0, 6 pi) (`v_range` pieces `[0, 2 pi]` and `[2 pi, 6 pi]`) and colours by theta/6 pi; domain colouring is `hue = arg / 2 pi`, `l = 1 − 1/(1 + sqrt m)`. |

### 7.3 Interaction script

**None.** A video has no page of its own, and the goal's acceptance kinds are `smoke`, `unit_test`, `screenshot_review` and `code_inspection`.
`tests/interact/i2-videos-4d.mjs` is therefore not written (an empty script would be run by `tools/interact-all.mjs` against a route that does not exist).
The one browser-side behaviour that depends on this goal, "the panel appears on `#graph4d` once the manifest lists `shadows-4d`", is `i2-pictures`' acceptance.
After the render the builder runs `node tools/smoke.mjs --route graph4d` once and records the result in the review note; it is not a gate here, because
`tools/smoke.mjs`'s static server has no MIME type or Range support for `.mp4` (known from media-core, E19) and may report a media error that is the harness's.

---

## 8. Edge cases, performance plan, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Audio run later (clips longer or shorter than the estimate) | `k = t / est` rescales every cue and every `rt`; fixed 0.4 s and 0.3 s fades do not scale; a beat that still overruns is only longer. Checked mentally for k from 0.8 to 1.5; re-render and look at the A3 stills again after the first audio run. |
| E2 | Narration text edited | cue table drifts; U3 pins the word counts; 5.9 gives the helper. Changing `PAD_SECONDS` or `WORDS_PER_SECOND` in `narrated.py` is followed automatically (imported). |
| E3 | `wait` of zero or less | guarded by `Clock.until` (D6). Never call `self.wait(x)` directly. |
| E4 | A single beat re-rendered while debugging | `close` raises `KeyError` for a missing snapshot. Render the whole file, or temporarily comment out the other beats and the `close` call. |
| E5 | The probe lap, `Arc` with angle exactly 0 | the code passes `1e-6` when `abs(angle) <= 1e-6` (manim draws nothing for 0 and can raise on a degenerate arc). |
| E6 | The w ray at the origin (not reached: \|w\| ≥ 1.25) | not needed; the lap radius is 1.118 to 1.2. |
| E7 | Depth sorting of 3D marks (painter's algorithm) | a dot on a surface can be hidden by neighbours; the dots are 0.11 to 0.14 big, the surfaces 0.9 opaque, the curves on the sphere sit 1.2 percent above it, and long curves are cut into short pieces (5.7). The walker's marker is judged on stills (14 s of riemann). |
| E8 | Missing LaTeX | `MathTex` raises; the local agent's `check.mjs --tools` reports BasicTeX. There is no silent fallback (a different glyph set would change the look). |
| E9 | `Text` glyphs missing in a font | the symbols are `½ ¼ ¾ · → − ° ∞`; all exist in macOS system fonts and DejaVu. If a build box lacks them, install DejaVu. |
| E10 | `--renderer opengl` | not supported (`snap` reads the Cairo camera, shading flag is Cairo's). `render.mjs` does not pass it. |
| E11 | Different frame rates | every duration is in seconds; the only frame-dependent thing is the one-frame floor of `rt` and `until`. |
| E12 | Surface faces with `become` | each frame builds a new `Surface` of the same structure and calls `become`; the colours are set on the new object before `become`. Do not reorder these two steps. |

### 8.2 Performance plan

Measured, not guessed: 2 min 19 s at 480p15 and 5 min 49 s at 720p30 on the cloud box (single core busy); mp4 sizes 3.47 and 6.2 MB. The loop only needs `-ql`. Dynamic 3D time is about 28 s (the quarter turn and back 9 s, the walker 6.5 s, the half-turn 4 s, the traveller 4.4 s, camera moves 5 s); everything else is static holds. If the −qm render must be cheaper: `n = 16` in `surface_at` and `resolution = (8, ...)` in `sheet`, which cut the face count by a third at a small cost in smoothness.

### 8.3 Accessibility

- **Captions.** The `.vtt` is the narration, one cue per beat; the station's panel turns them on by default (`<track kind="captions" default>`). A silent viewer loses nothing the narration says.
- **Colour.** Nothing is carried by colour alone: Cartesian and polar are also named in words on the domain readout ("Cartesian:", "polar:"); the hue wheel is drawn with its words ("hue: its angle", "brightness: its length"); input and output are named by letters (`z`, `w`); the cut is also dashed and labelled.
- **Contrast.** Every text colour is at least 7.5:1 on `BG` (section 3).
- **Text size.** Labels are 18 to 26 pt, the three state names of the surfaces beat 34 pt. At a 324 px inline width on a phone the labels are small; the shapes and the colour are what the inline picture is for, the labels are for fullscreen (landscape, about 800 px). This is stated rather than hidden (8.5).
- **Flashing.** No flash; the fastest events are 0.3 s fades and one 6 percent pulse.
- **Screen readers.** The video element is native; the station owns its accessible name.

### 8.4 Reduced motion

A video cannot read `prefers-reduced-motion`. It does not autoplay (`preload="metadata"`), the student starts it and can pause, scrub or step with the native controls. The motion inside is slow and smooth (25 degrees per second at most, camera moves of 25 to 30 degrees over 2.5 to 6.5 s, no shake, no zoom, no parallax). The station's other pictures honour reduced motion as before; this goal changes none of them.

### 8.5 Phone layout

The raster is 16:9 and scales: 324 x 182 px inline at 390 px width (media-core measured), full screen in landscape. Layout rules used: nothing within 0.3 units of the frame edge; the right-hand text column of the 3D beats ends at x = 7.0 (frame edge 7.11); the closing tiles are 13.2 units wide of 14.2; every label has a gap of at least 0.1 units to its neighbours (checked on the 854 x 480 stills). Inline on a phone the viewer sees shapes and colours; fullscreen shows the words.

---

## 9. Out of scope

- Audio (narration clips, music): generated on the student's machine by `npm run media`; this goal renders silent. The music prompt in the JSON is for that run.
- Embedding the video in `graph4d` and the panel's styling: `i2-pictures` (`graph4d.js` already calls `videoPanel(videoHost, 'shadows-4d')`).
- Interactive 3D: the station (`graph4d`) is the interactive version of the same object.
- The other four videos (`two-addresses`, `staircase-roots`, `motion-time`, `zoom-cr`).
- `media/manifest.js`: generated by `render.mjs`, never edited.
- A staircase list of names for arg z (the `staircase-roots` video does it); this video shows Arg only.

Requests for other owners (nothing blocks the goal):
1. `videos/lib/palette.py` (owner `i2-media-core`, done): add `HIDDEN_RAMP_STOPS` (the five viridis stops of `three-view.js`) and a `hidden_ramp(t)` helper so scenes need no local copy. Until then `shadows-4d.py` carries `HIDDEN_STOPS` and U13 pins it to `three-view.js`.
2. `tools/smoke.mjs` (owner: harness): `.mp4`, `.vtt`, `.mp3` MIME types and Range support in the static server, so a real clip can be played in the smoke run (media-core E19). Not needed for this goal's checks.
3. `js/stations/graph4d.js` (owner `i2-pictures`): the video's quarter turn runs 0 to −90 degrees (so it ends on +Im); the station's slider runs 0 to +90 and ends on −Im (the Im surface upside down). If the station's text says "becomes the Im surface" it may add "(upside down)" or the video may follow; no code change is required by this goal.

---

## Appendix A: `videos/scenes/shadows-4d.py` (the verified reference implementation)

```python
"""shadows-4d: the graph of w = f(z) needs four numbers; every picture on the site is one of its shadows.

Beats (the narration segment ids, in order): intro, side, domain, surfaces, riemann, sphere, close.
Render: node tools/videos/render.mjs --only shadows-4d --quality l   (480p15 check)  or  --quality m  (720p30 deliverable).

The file has two halves. Everything above the marker comment before `from manim import *` is pure maths (math and numpy only, no
manim): tests/unit/i2-videos-4d.test.mjs executes that half under python3 and compares it with js/core/three-view.js and
js/core/domaincolor.js. Everything below it is the manim scene.
"""
import math

import numpy as np

TAU = 2 * math.pi

# ============================ pure maths (math + numpy only) ============================


def stereographic(re, im):
    if not (math.isfinite(re) and math.isfinite(im)):
        return (0.0, 0.0, 1.0)
    h = math.hypot(re, im)
    if h > 1e7:
        q = 1.0 / h
        d = 1.0 + q * q
        return (2 * (re / h) * q / d, 2 * (im / h) * q / d, (1 - q * q) / d)
    s = re * re + im * im
    return (2 * re / (s + 1), 2 * im / (s + 1), (s - 1) / (s + 1))


def inverse_stereographic(X, Y, Z):
    d = 1.0 - Z
    if not d > 0:
        return (math.inf, math.inf)
    return (X / d, Y / d)


def rotate_uv(p, alpha):
    x, y, u, v = p
    c, s = math.cos(alpha), math.sin(alpha)
    return (x, y, u * c - v * s, u * s + v * c)


def rot_x(p, a):
    X, Y, Z = p
    c, s = math.cos(a), math.sin(a)
    return (X, Y * c - Z * s, Y * s + Z * c)


def square_fn(x, y):
    return (x * x - y * y, 2 * x * y)


def riemann_point(r, theta, n=3, part="im"):
    rho = r ** (1.0 / n)
    a = theta / n
    re, im = rho * math.cos(a), rho * math.sin(a)
    return (r * math.cos(theta), r * math.sin(theta), re if part == "re" else im, im if part == "re" else re)


def hue_of(re, im):
    h = math.atan2(im, re) / TAU
    if h < 0:
        h += 1
    if h >= 1:
        h = 0.0
    return h


def lightness_of(re, im):
    """1 - 1 / (1 + sqrt|w|): 0 at 0, 0.5 at |w| = 1, towards 1 at infinity (domaincolor.js lightnessOf)."""
    return 1 - 1 / (1 + math.sqrt(math.hypot(re, im)))


def domain_rgb(re, im, rings=True):
    m2 = re * re + im * im
    if m2 == 0:
        return (0, 0, 0)
    m = math.sqrt(m2)
    l = 1 - 1 / (1 + math.sqrt(m))
    if rings:
        lg = math.log2(m)
        l *= 0.88 + 0.12 * (lg - math.floor(lg))
    h = hue_of(re, im)
    a = 0.8 * min(l, 1 - l)
    h12 = h * 12
    out = []
    for n in (0, 8, 4):
        k = (n + h12) % 12
        out.append(int(math.floor(255 * (l - a * max(-1, min(k - 3, 9 - k, 1))) + 0.5)))
    return tuple(out)


def domain_image(f, half=2.0, px=600, rings=True, mask_radius=None):
    xs = np.linspace(-half, half, px)
    ys = np.linspace(half, -half, px)
    X, Y = np.meshgrid(xs, ys)
    W = f(X + 1j * Y)
    mod = np.abs(W)
    with np.errstate(divide="ignore", invalid="ignore"):
        l = 1 - 1 / (1 + np.sqrt(mod))
        if rings:
            lg = np.log2(np.where(mod > 0, mod, 1.0))
            l = l * (0.88 + 0.12 * (lg - np.floor(lg)))
    h = (np.angle(W) / TAU) % 1.0
    a = 0.8 * np.minimum(l, 1 - l)
    chans = []
    for n in (0, 8, 4):
        k = (n + h * 12) % 12
        chans.append(l - a * np.maximum(-1, np.minimum(np.minimum(k - 3, 9 - k), 1)))
    rgb = np.stack(chans, axis=-1)
    rgb = np.where((mod == 0)[..., None], 0.0, rgb)
    rgb = np.floor(np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    alpha = np.full((px, px, 1), 255, dtype=np.uint8)
    if mask_radius is not None:
        alpha = ((X ** 2 + Y ** 2) <= mask_radius ** 2).astype(np.uint8)[..., None] * 255
    return np.concatenate([rgb, alpha], axis=-1)


HIDDEN_STOPS = [(0.0, (68, 1, 84)), (0.25, (59, 82, 139)), (0.5, (33, 145, 140)), (0.75, (94, 201, 98)), (1.0, (253, 231, 37))]


def hidden_ramp(t):
    if t != t:
        t = 0.5
    t = min(1.0, max(0.0, t))
    s = 4 * t
    i = min(3, int(math.floor(s)))
    f = s - i
    a, b = HIDDEN_STOPS[i][1], HIDDEN_STOPS[i + 1][1]
    return tuple((a[k] + (b[k] - a[k]) * f) / 255 for k in range(3))


def hsl_to_rgb(h, s, l):
    h = h - math.floor(h)
    c = (1 - abs(2 * l - 1)) * s
    h6 = h * 6
    x = c * (1 - abs((h6 % 2) - 1))
    m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(math.floor(h6)) % 6]
    return (r + m, g + m, b + m)




def side_stroke(t):
    """The stroke of the side beat: the vertical line x = 1, y from -1.4 to 1.4, as (x, y)."""
    return (1.0, -1.4 + 2.8 * t)


def side_image(t):
    return square_fn(*side_stroke(t))


def circle_z(t):
    """z(t) = 1 + e^{i(pi + 2 pi t)}: the circle |z - 1| = 1, starting and ending at 0, as (x, y)."""
    return (1 - math.cos(TAU * t), -math.sin(TAU * t))


def recip(x, y):
    d = x * x + y * y
    return (x / d, -y / d) if d > 0 else (math.inf, math.inf)


def arg_color(re, im):
    return hsl_to_rgb(math.atan2(im, re) / TAU, 0.8, 0.5)


# ---- scene: manim below this line (tests/unit/i2-videos-4d.test.mjs executes only what is above) ----
from manim import *  # noqa: E402,F401,F403

from lib.narrated import NarratedScene, WORDS_PER_SECOND, PAD_SECONDS, MIN_BEAT_SECONDS  # noqa: E402
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, WARN, OK, mix, ramp  # noqa: E402


def rgb_col(rgb):
    return rgb_to_color([float(c) for c in rgb])


def sgn(x, nd=2):
    """'1.25' or '−0.59' (a real minus sign)"""
    return f"{x:.{nd}f}".replace("-", "−")


def cplx(x, y, nd=2):
    return f"{sgn(x, nd)} {'−' if y < 0 else '+'} {abs(y):.{nd}f}i"


def rgb255(rgb):
    return rgb_to_color([c / 255 for c in rgb])


class Clock:
    """Absolute cues inside a beat, in the seconds of the silent estimate; scales when audio changes the beat length."""

    def __init__(self, scene, t, est):
        self.s, self.t0, self.k = scene, scene.renderer.time, t / est

    def now(self):
        return (self.s.renderer.time - self.t0) / self.k

    def until(self, sec):
        d = (sec - self.now()) * self.k
        if d >= 1.0 / config.frame_rate:
            self.s.wait(d)

    def rt(self, secs):
        return max(secs * self.k, 1.0 / config.frame_rate)


class Main(NarratedScene, ThreeDScene):
    narration_id = "shadows-4d"

    # ------------------------------------------------------------ helpers
    def construct(self):
        self.camera.background_color = BG
        self.camera.should_apply_shading = False
        self.set_camera_orientation(phi=0, theta=-90 * DEGREES)
        self.tag_mob = None
        self.stage = []
        self.snaps = {}
        self.beat_intro()
        self.beat_side()
        self.beat_domain()
        self.beat_surfaces()
        self.beat_riemann()
        self.beat_sphere()
        self.beat_close()

    def est(self, seg_id):
        words = len(self.segments[seg_id]["text"].split())
        return max(MIN_BEAT_SECONDS, words / WORDS_PER_SECOND) + PAD_SECONDS

    def put_tag(self, text):
        new = Text(text, font_size=24, color=MUTED).to_corner(UL, buff=0.3)
        if self.tag_mob is not None:
            self.remove(self.tag_mob)
            self.remove_fixed_in_frame_mobjects(self.tag_mob)
        self.add_fixed_in_frame_mobjects(new)
        self.tag_mob = new

    def fixed(self, *mobs):
        self.add_fixed_in_frame_mobjects(*mobs)
        self.remove(*mobs)
        return mobs

    def clear_stage(self, run_time=0.3):
        mobs = list(self.stage)
        if mobs:
            self.play(*[FadeOut(m) for m in mobs], run_time=run_time)
            self.remove(*mobs)
            self.remove_fixed_in_frame_mobjects(*mobs)
            self.remove_fixed_orientation_mobjects(*mobs)
        self.stage = []

    def snap(self, name, box):
        x0, y0, x1, y1 = box
        arr = np.array(self.renderer.camera.pixel_array)
        H, W = arr.shape[:2]
        fw, fh = config.frame_width, config.frame_height
        px0, px1 = int(round((x0 + fw / 2) / fw * W)), int(round((x1 + fw / 2) / fw * W))
        py0, py1 = int(round((fh / 2 - y1) / fh * H)), int(round((fh / 2 - y0) / fh * H))
        self.snaps[name] = np.ascontiguousarray(arr[py0:py1, px0:px1, :])

    def ramp_stroke(self, pts, base, width=6, opacity=1.0):
        n = len(pts) - 1
        return VGroup(*[Line(pts[i], pts[i + 1], color=ramp(base, (i + 0.5) / n), stroke_width=width, stroke_opacity=opacity) for i in range(n)])

    def make_plane(self, center, side, rx, ry=None):
        ry = ry or rx
        p = NumberPlane(
            x_range=[rx[0], rx[1], 1], y_range=[ry[0], ry[1], 1], x_length=side * (rx[1] - rx[0]) / (ry[1] - ry[0]), y_length=side,
            background_line_style={"stroke_color": MUTED, "stroke_width": 1, "stroke_opacity": 0.28},
            axis_config={"stroke_color": MUTED, "stroke_width": 2, "stroke_opacity": 0.9},
        )
        p.move_to(center)
        return p

    # ------------------------------------------------------------ 1 intro
    def beat_intro(self):
        with self.beat("intro") as t:
            c = Clock(self, t, self.est("intro"))
            self.put_tag("the graph of w = f(z)")
            title = MathTex(r"w=f(z)", color=INK).scale(1.5).move_to(UP * 3.0)
            zp = self.make_plane(LEFT * 4.0 + UP * 0.7, 3.4, (-2, 2))
            wp = self.make_plane(RIGHT * 4.0 + UP * 0.7, 3.4, (-4, 4))
            f_arrow = Arrow(LEFT * 1.4 + UP * 0.7, RIGHT * 1.4 + UP * 0.7, color=INK, buff=0, stroke_width=4)
            f_lab = MathTex(r"f", color=INK).next_to(f_arrow, UP, buff=0.1)
            axl = VGroup(
                Text("x", font_size=24, color=CART).next_to(zp.c2p(2, 0), DOWN, buff=0.06),
                Text("y", font_size=24, color=CART).next_to(zp.c2p(0, 2), LEFT, buff=0.08),
                Text("u", font_size=24, color=CART).next_to(wp.c2p(4, 0), DOWN, buff=0.06),
                Text("v", font_size=24, color=CART).next_to(wp.c2p(0, 4), LEFT, buff=0.08),
            )
            zt = MathTex(r"z", color=INPUT).next_to(zp, UP, buff=0.12).align_to(zp, LEFT)
            wt = MathTex(r"w", color=OUTPUT).next_to(wp, UP, buff=0.12).align_to(wp, LEFT)
            planes = VGroup(zp, wp, f_arrow, f_lab, axl, zt, wt)
            self.play(FadeIn(title), run_time=c.rt(0.6))
            self.play(FadeIn(planes), run_time=c.rt(0.8))
            self.stage = [title, planes]
            c.until(3.0)
            dz = Dot(zp.c2p(1, 1), radius=0.1, color=INPUT)
            dw = Dot(wp.c2p(0, 2), radius=0.1, color=OUTPUT)
            self.play(FadeIn(dz), FadeIn(dw), run_time=c.rt(0.5))
            self.stage += [dz, dw]
            vals = [("x", "1", 4.4), ("y", "1", 5.8), ("u", "0", 7.2), ("v", "2", 8.6)]
            chips = VGroup(*[
                VGroup(Text(a + " =", font_size=30, color=CART), Text(b, font_size=30, color=INK)).arrange(RIGHT, buff=0.12)
                for a, b, _ in vals
            ]).arrange(RIGHT, buff=0.6).move_to(DOWN * 2.0)
            self.stage += [chips]
            for ch, (_, _, at) in zip(chips, vals):
                c.until(at)
                self.play(FadeIn(ch, shift=UP * 0.2), run_time=c.rt(0.5))
            c.until(9.3)
            brace = Brace(chips, DOWN, color=INK)
            btxt = Text("four numbers", font_size=30, color=INK).next_to(brace, DOWN, buff=0.1)
            self.play(GrowFromCenter(brace), FadeIn(btxt), run_time=c.rt(0.5))
            self.stage += [brace, btxt]
            # nobody can draw four dimensions
            c.until(10.0)
            self.play(FadeOut(planes), FadeOut(dz), FadeOut(dw), FadeOut(brace), FadeOut(btxt), chips.animate.move_to(UP * 2.0), run_time=c.rt(0.5))
            o = DOWN * 0.5
            ax = VGroup(
                Arrow(o, o + RIGHT * 1.6, buff=0, color=CART, stroke_width=4),
                Arrow(o, o + UP * 1.3, buff=0, color=CART, stroke_width=4),
                Arrow(o, o + (LEFT * 1.0 + DOWN * 0.7), buff=0, color=CART, stroke_width=4),
                DashedLine(o, o + (RIGHT * 1.0 + DOWN * 0.9), color=WARN, stroke_width=4),
            )
            labs = VGroup(
                Text("x", font_size=26, color=CART).move_to(o + RIGHT * 1.95),
                Text("y", font_size=26, color=CART).move_to(o + UP * 1.6),
                Text("u", font_size=26, color=CART).move_to(o + LEFT * 1.3 + DOWN * 0.95),
                Text("v ?", font_size=26, color=WARN).move_to(o + RIGHT * 1.5 + DOWN * 1.2),
            )
            self.play(FadeIn(ax), FadeIn(labs), run_time=c.rt(0.6))
            self.stage += [ax, labs]
            c.until(12.0)
            names = ["side by side", "painted plane", "real and imaginary", "root staircase", "sphere"]
            self.play(FadeOut(ax), FadeOut(labs), run_time=c.rt(0.4))
            boxes = VGroup(*[
                VGroup(RoundedRectangle(corner_radius=0.12, width=2.6, height=1.3, stroke_color=SEAM, stroke_width=2, fill_color=SURFACE, fill_opacity=1),
                       VGroup(Text(str(i + 1), font_size=22, color=MUTED), Text(n, font_size=18, color=INK)).arrange(DOWN, buff=0.1))
                for i, n in enumerate(names)
            ]).arrange(RIGHT, buff=0.15).move_to(DOWN * 0.8)
            fan = VGroup(*[Line(chips.get_bottom() + DOWN * 0.1, b.get_top(), color=MUTED, stroke_width=2, stroke_opacity=0.6) for b in boxes])
            self.stage += [boxes, fan]
            for i, (b, ln) in enumerate(zip(boxes, fan)):
                c.until(12.6 + 1.2 * i)
                self.play(FadeIn(b, shift=DOWN * 0.15), FadeIn(ln), run_time=c.rt(0.4))
            c.until(19.2)
            self.play(*[b.animate.scale(1.06) for b in boxes], run_time=c.rt(0.3))
            self.play(*[b.animate.scale(1 / 1.06) for b in boxes], run_time=c.rt(0.3))
            c.until(20.3)
            self.clear_stage()

    # ------------------------------------------------------------ 2 side
    def beat_side(self):
        with self.beat("side") as t:
            c = Clock(self, t, self.est("side"))
            self.put_tag("1 of 5 · side by side")
            zp = self.make_plane(LEFT * 3.8 + UP * 0.35, 4.8, (-2, 2))
            wp = self.make_plane(RIGHT * 3.8 + UP * 0.35, 4.8, (-4, 4))
            labs = VGroup(
                Text("x", font_size=24, color=CART).next_to(zp.c2p(2, 0), DOWN, buff=0.06),
                Text("y", font_size=24, color=CART).next_to(zp.c2p(0, 2), LEFT, buff=0.08),
                Text("u", font_size=24, color=CART).next_to(wp.c2p(4, 0), DOWN, buff=0.06),
                Text("v", font_size=24, color=CART).next_to(wp.c2p(0, 4), LEFT, buff=0.08),
                MathTex(r"z=x+iy", color=INPUT).scale(0.8).next_to(zp, UP, buff=0.12),
                MathTex(r"w=z^{2}=u+iv", color=OUTPUT).scale(0.8).next_to(wp, UP, buff=0.12),
            )
            N = 40
            zs = self.ramp_stroke([zp.c2p(*side_stroke(i / N)) for i in range(N + 1)], INPUT)
            ws = self.ramp_stroke([wp.c2p(*side_image(i / N)) for i in range(N + 1)], OUTPUT)
            tt = [0, 0.25, 0.5, 0.75, 1]
            zd = VGroup(*[Dot(zp.c2p(*side_stroke(a)), radius=0.085, color=ramp(INPUT, a, 0.6)) for a in tt])
            wd = VGroup(*[Dot(wp.c2p(*side_image(a)), radius=0.085, color=ramp(OUTPUT, a, 0.6)) for a in tt])
            tl = ["0", "¼", "½", "¾", "1"]
            zl = VGroup(*[Text(x, font_size=20, color=MUTED).next_to(d, LEFT, buff=0.12) for x, d in zip(tl, zd)])
            wl = VGroup(*[Text(x, font_size=20, color=MUTED).next_to(d, RIGHT, buff=0.12) for x, d in zip(tl, wd)])
            arrow = Arrow(LEFT * 1.0 + UP * 0.35, RIGHT * 1.0 + UP * 0.35, color=INK, buff=0, stroke_width=4)
            flab = MathTex(r"f", color=INK).next_to(arrow, UP, buff=0.08)
            clk = Text("t: 0 → 1", font_size=22, color=MUTED).next_to(arrow, DOWN, buff=0.1)
            tr = ValueTracker(0)
            ring_z = Circle(radius=0.2, color=INK, stroke_width=3).move_to(zp.c2p(*side_stroke(0)))
            ring_w = Circle(radius=0.2, color=INK, stroke_width=3).move_to(wp.c2p(*side_image(0)))
            ring_z.add_updater(lambda m: m.move_to(zp.c2p(*side_stroke(tr.get_value()))))
            ring_w.add_updater(lambda m: m.move_to(wp.c2p(*side_image(tr.get_value()))))
            pic = VGroup(zp, wp, labs, zs, ws, zd, wd, zl, wl, arrow, flab, clk, ring_z, ring_w)
            self.play(FadeIn(pic), run_time=0.4)
            self.stage = [pic]
            c.until(3.6)
            self.play(tr.animate.set_value(1), run_time=c.rt(6.0), rate_func=linear)          # 3.6 -> 9.6
            c.until(10.8)
            for i, a in enumerate(tt):                                                         # 10.8 -> 15.2
                self.play(tr.animate.set_value(a), run_time=c.rt(0.35), rate_func=smooth)
                c.until(10.8 + 0.9 * (i + 1))
            self.play(tr.animate.set_value(0.25), run_time=c.rt(0.4), rate_func=smooth)
            self.snap("side", (-6.5, -2.3, 6.5, 3.4))
            c.until(15.6)
            # make room: shrink the pair towards the top, then open the microscope
            self.play(pic.animate.scale(0.8, about_point=UP * 3.0), run_time=c.rt(0.5))
            z0 = side_stroke(0.25)
            w0 = square_fn(*z0)
            rho, M = 0.1, 2.0
            cL, cR = LEFT * 2.9 + DOWN * 2.65, RIGHT * 2.9 + DOWN * 2.65
            discL = Circle(radius=1.1, color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=1).move_to(cL)
            discR = Circle(radius=1.1, color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=1).move_to(cR)
            cs = [(z0[0] - rho, z0[1] - rho), (z0[0] + rho, z0[1] - rho), (z0[0] + rho, z0[1] + rho), (z0[0] - rho, z0[1] + rho)]
            outline = []
            for i in range(4):
                p, q = cs[i], cs[(i + 1) % 4]
                outline += [(p[0] + (q[0] - p[0]) * j / 8, p[1] + (q[1] - p[1]) * j / 8) for j in range(8)]
            sqL = Polygon(*[np.array([(p[0] - z0[0]) * M, (p[1] - z0[1]) * M, 0]) + cL for p in outline], color=INPUT, stroke_width=3, fill_color=INPUT, fill_opacity=0.25)
            sqR = Polygon(*[np.array([(q[0] - w0[0]) * M, (q[1] - w0[1]) * M, 0]) + cR for q in (square_fn(*p) for p in outline)], color=OUTPUT, stroke_width=3, fill_color=OUTPUT, fill_opacity=0.25)
            fpr = (2 * z0[0], 2 * z0[1])
            aL = Arrow(cL, cL + RIGHT * 0.4, buff=0, color=INK, stroke_width=4, max_tip_length_to_length_ratio=0.35)
            aR = Arrow(cR, cR + np.array([(fpr[0] * 0.2) * M, (fpr[1] * 0.2) * M, 0]), buff=0, color=INK, stroke_width=4, max_tip_length_to_length_ratio=0.35)
            cap1 = Text("up close:", font_size=22, color=INK).move_to(DOWN * 2.2)
            cap2 = MathTex(r"f'(z)=2z", color=INK).scale(0.8).move_to(DOWN * 2.75)
            cap3 = Text("stretch 2.44, turn −35°", font_size=20, color=POLAR).move_to(DOWN * 3.3)
            mic = VGroup(discL, discR, sqL, sqR, cap1)
            self.play(FadeIn(mic), run_time=c.rt(0.5))
            self.stage += [mic, aL, aR, cap2, cap3]
            c.until(19.6)
            self.play(FadeIn(aL), FadeIn(aR), run_time=c.rt(0.8))
            c.until(21.4)
            self.play(FadeIn(cap2), FadeIn(cap3), run_time=c.rt(0.6))
            c.until(self.est("side") - 0.45)
            ring_z.clear_updaters()
            ring_w.clear_updaters()
            self.clear_stage()

    # ------------------------------------------------------------ 3 domain
    def beat_domain(self):
        with self.beat("domain") as t:
            c = Clock(self, t, self.est("domain"))
            self.put_tag("2 of 5 · painted plane")
            side = 4.8
            cp = LEFT * 4.2 + DOWN * 0.1
            unit = side / 4.0
            img = ImageMobject(domain_image(lambda z: z * z, 2.0, 600)).scale_to_fit_height(side).move_to(cp)
            frame = Square(side_length=side, color=MUTED, stroke_width=2).move_to(cp)
            ax = VGroup(
                Line(cp + LEFT * side / 2, cp + RIGHT * side / 2, color=INK, stroke_width=1.5, stroke_opacity=0.5),
                Line(cp + DOWN * side / 2, cp + UP * side / 2, color=INK, stroke_width=1.5, stroke_opacity=0.5),
                Text("x", font_size=24, color=CART).next_to(cp + RIGHT * side / 2, DOWN, buff=0.06),
                Text("y", font_size=24, color=CART).next_to(cp + UP * side / 2, LEFT, buff=0.08),
                MathTex(r"z", color=INPUT).next_to(frame, UP, buff=0.1).align_to(frame, LEFT),
            )
            self.play(FadeIn(img), FadeIn(frame), FadeIn(ax), run_time=0.4)
            self.stage = [img, frame, ax]
            c.until(0.8)
            how = VGroup(Text("place: x, y", font_size=22, color=CART), Text("colour: w", font_size=22, color=OUTPUT)).arrange(RIGHT, buff=0.5).next_to(frame, DOWN, buff=0.2)
            self.play(FadeIn(how), run_time=c.rt(0.5))
            self.stage += [how]

            def zpos(x, y):
                return cp + RIGHT * x * unit + UP * y * unit

            wp = self.make_plane(RIGHT * 0.3 + UP * 1.2, 3.0, (-2, 2))
            wlab = MathTex(r"w=z^{2}", color=OUTPUT).scale(0.8).next_to(wp, UP, buff=0.1)
            wheel = ImageMobject(domain_image(lambda z: z, 2.0, 300, mask_radius=2.0)).scale_to_fit_height(1.5).move_to(RIGHT * 2.6 + UP * 1.7)
            hue_txt = Text("hue: its angle", font_size=20, color=POLAR)
            bri_txt = Text("brightness: its length", font_size=20, color=POLAR)
            legend = VGroup(hue_txt, bri_txt).arrange(DOWN, aligned_edge=LEFT, buff=0.15).next_to(wheel, RIGHT, buff=0.25)
            hue_txt.set_opacity(0.35)
            bri_txt.set_opacity(0.35)
            ph = ValueTracker(math.atan2(0.5, 1.0))
            rr = ValueTracker(math.hypot(1.0, 0.5))

            def zc():
                a, r = ph.get_value(), rr.get_value()
                return r * math.cos(a), r * math.sin(a)

            def build_probe():
                x, y = zc()
                p = zpos(x, y)
                dl = VGroup(DashedLine(zpos(x, 0), p, color=CART, stroke_width=3, dash_length=0.08),
                            DashedLine(zpos(0, y), p, color=CART, stroke_width=3, dash_length=0.08))
                dot = Dot(p, radius=0.11, color=INK).set_stroke(BG, 2)
                return VGroup(dl, dot)

            def build_wprobe():
                u, v = square_fn(*zc())
                q = wp.c2p(u, v)
                ang = math.atan2(v, u)
                ray = Line(wp.c2p(0, 0), q, color=POLAR, stroke_width=4)
                arc = Arc(radius=0.45, start_angle=0, angle=ang if abs(ang) > 1e-6 else 1e-6, arc_center=wp.c2p(0, 0), color=POLAR, stroke_width=4)
                wdot = Dot(q, radius=0.11, color=rgb255(domain_rgb(u, v))).set_stroke(INK, 2)
                return VGroup(ray, arc, wdot)

            def build_readout():
                x, y = zc()
                u, v = square_fn(x, y)
                a = Text(f"z = {cplx(x, y)}    Cartesian: x = {sgn(x)}, y = {sgn(y)}", font_size=20, color=CART)
                b = Text(f"w = {cplx(u, v)}    polar: r = {math.hypot(u, v):.2f}, θ = {sgn(math.degrees(math.atan2(v, u)), 1)}°", font_size=20, color=POLAR)
                return VGroup(a, b).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to(RIGHT * 2.0 + DOWN * 1.75)

            probe = always_redraw(build_probe)
            readout = always_redraw(build_readout)
            c.until(5.6)
            self.add(probe, readout)
            self.stage += [probe, readout]
            c.until(9.2)
            wprobe = always_redraw(build_wprobe)
            self.play(FadeIn(wp), FadeIn(wlab), FadeIn(wheel), FadeIn(legend), run_time=c.rt(0.6))
            self.add(wprobe)
            self.stage += [wp, wlab, wheel, legend, wprobe]
            c.until(12.8)
            hue_txt.set_opacity(1)
            c.until(14.4)
            bri_txt.set_opacity(1)
            c.until(16.0)
            def key(col, text, y):
                sw = Square(side_length=0.22, stroke_color=INK, stroke_width=1.5, fill_color=col, fill_opacity=1)
                tx = Text(text, font_size=20, color=INK)
                return VGroup(sw, tx).arrange(RIGHT, buff=0.15).move_to(np.array([-1.2, -y, 0]), aligned_edge=LEFT)
            k_red = key(rgb255(domain_rgb(1.0, 0.0)), "red: w on the positive real axis", 2.6)
            axis_hi = DashedLine(cp + LEFT * side / 2, cp + RIGHT * side / 2, color=INK, stroke_width=3, dash_length=0.1)
            self.play(FadeIn(k_red), FadeIn(axis_hi), run_time=c.rt(0.4))
            self.stage += [k_red, axis_hi]
            c.until(18.8)
            k_blk = key(rgb255(domain_rgb(0.0, 0.0)), "black: w = 0", 3.05)
            zero_ring = Circle(radius=0.16, color=INK, stroke_width=3).move_to(cp)
            self.play(FadeIn(k_blk), FadeIn(zero_ring), FadeOut(axis_hi), run_time=c.rt(0.4))
            self.stage += [k_blk, zero_ring]
            c.until(20.0)
            self.play(ph.animate.set_value(math.atan2(0.5, 1.0) + TAU), rr.animate.set_value(1.2), run_time=c.rt(3.0), rate_func=linear)
            self.snap("domain", (-6.8, -2.7, -1.6, 2.5))
            probe.clear_updaters()
            readout.clear_updaters()
            wprobe.clear_updaters()
            c.until(self.est("domain") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 4 surfaces
    def surface_at(self, alpha, n=20):
        k_xy, k_h, half = 1.5, 0.36, 1.5

        def func(x, y):
            u, v = square_fn(x, y)
            return np.array([k_xy * x, k_xy * y, k_h * rotate_uv((x, y, u, v), alpha)[2]])

        s = Surface(func, u_range=[-half, half], v_range=[-half, half], resolution=(n, n), fill_opacity=1,
                    checkerboard_colors=False, stroke_color=BG, stroke_width=0.4)
        for face in s.list_of_faces:
            xm, ym = (face.u1 + face.u2) / 2, (face.v1 + face.v2) / 2
            u, v = square_fn(xm, ym)
            hid = rotate_uv((xm, ym, u, v), alpha)[3]
            face.set_fill(rgb_col(hidden_ramp(0.5 + 0.5 * hid / 4.5)), 1)
        return s

    def beat_surfaces(self):
        with self.beat("surfaces") as t:
            c = Clock(self, t, self.est("surfaces"))
            self.put_tag("3 of 5 · real and imaginary")
            self.set_camera_orientation(phi=58 * DEGREES, theta=-60 * DEGREES)
            surf = self.surface_at(0.0)
            floor = VGroup(*[Line(np.array([-2.25, k * 0.75, -1.85]), np.array([2.25, k * 0.75, -1.85]), color=MUTED, stroke_width=1, stroke_opacity=0.35) for k in range(-3, 4)],
                           *[Line(np.array([k * 0.75, -2.25, -1.85]), np.array([k * 0.75, 2.25, -1.85]), color=MUTED, stroke_width=1, stroke_opacity=0.35) for k in range(-3, 4)])
            cx = RIGHT * 4.3

            def cap(text, size, color, y):
                return Text(text, font_size=size, color=color).move_to(cx + UP * y)

            cap_r, sub_r = cap("real surface", 34, INK, 3.2), cap("height u, colour v", 22, MUTED, 2.65)
            cap_t, sub_t = cap("real → imaginary", 34, INK, 3.2), cap("turning in the u–v plane", 22, MUTED, 2.65)
            cap_i, sub_i = cap("imaginary surface", 34, INK, 3.2), cap("height v, colour −u", 22, MUTED, 2.65)
            bar = Rectangle(width=0.3, height=2.4, stroke_color=SEAM, stroke_width=1.5)
            bar.set_fill(color=[rgb_col(hidden_ramp(1)), rgb_col(hidden_ramp(0.5)), rgb_col(hidden_ramp(0))], opacity=1)
            bar.set(sheen_direction=DOWN)
            bar.move_to(RIGHT * 6.3 + DOWN * 0.4)
            bl = Text("colour", font_size=22, color=MUTED).next_to(bar, UP, buff=0.1)
            self.fixed(cap_r, sub_r, cap_t, sub_t, cap_i, sub_i, bar, bl)
            self.play(FadeIn(surf), FadeIn(floor), FadeIn(cap_r), FadeIn(sub_r), FadeIn(bar), FadeIn(bl), run_time=0.4)
            self.stage = [surf, floor, cap_r, sub_r, bar, bl]

            def turn(a0, a1, secs, extra=()):
                """rotate4 with uv from a0 to a1 (degrees), linear in time; extra animations run alongside"""
                self.play(UpdateFromAlphaFunc(surf, lambda m, a: m.become(self.surface_at(math.radians(a0 + (a1 - a0) * a)))), *extra,
                          run_time=c.rt(secs), rate_func=linear)

            c.until(3.2)
            # the quarter turn: rotate4's u-v rotation from 0 to -90 degrees (25 degrees per second), so the end is exactly (x, y, v)
            turn(0, -7.5, 0.3, [FadeOut(cap_r), FadeOut(sub_r), FadeIn(cap_t), FadeIn(sub_t)])      # 3.2 -> 3.5
            turn(-7.5, -82.5, 3.0)                                                                 # 3.5 -> 6.5
            turn(-82.5, -90, 0.3, [FadeOut(cap_t), FadeOut(sub_t), FadeIn(cap_i), FadeIn(sub_i)])   # 6.5 -> 6.8
            self.stage += [cap_t, sub_t, cap_i, sub_i]
            self.snap("surfaces", (-3.4, -3.0, 3.4, 3.0))
            c.until(12.8)
            turn(-90, -86, 0.3, [FadeOut(cap_i), FadeOut(sub_i), FadeIn(cap_t), FadeIn(sub_t)])     # trades places: back to the real surface
            turn(-86, -4, 2.2)
            turn(-4, 0, 0.3, [FadeOut(cap_t), FadeOut(sub_t), FadeIn(cap_r), FadeIn(sub_r)])
            c.until(15.6)
            self.move_camera(theta=-30 * DEGREES, run_time=c.rt(2.5))
            c.until(self.est("surfaces") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 5 riemann
    def beat_riemann(self):
        with self.beat("riemann") as t:
            c = Clock(self, t, self.est("riemann"))
            self.put_tag("4 of 5 · root staircase")
            self.set_camera_orientation(phi=68 * DEGREES, theta=-58 * DEGREES)
            RMAX, kxy = 1.8, 1.5
            R3 = RMAX ** (1 / 3)

            def P(r, th):
                x, y, h, _ = riemann_point(r, th, 3, "im")
                return np.array([kxy * x, kxy * y, 1.35 * h])

            def sheet(v0, v1, res_v):
                sf = Surface(lambda s_, th: P(s_ ** 3, th), u_range=[0.0, R3], v_range=[v0, v1], resolution=(10, res_v), fill_opacity=0.9,
                             checkerboard_colors=False, stroke_color=BG, stroke_width=0.3)
                for face in sf.list_of_faces:
                    face.set_fill(rgb_col(hsl_to_rgb(((face.v1 + face.v2) / 2) / (6 * PI), 0.8, 0.5)), 0.9)
                return sf

            s0, s12 = sheet(0, 2 * PI, 18), sheet(2 * PI, 6 * PI, 36)
            cx = RIGHT * 4.3
            cap = VGroup(Text("height: Im of the cube root", font_size=24, color=INK), Text("colour: angle of the root", font_size=24, color=INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to(cx + UP * 3.1)
            self.fixed(cap)
            self.play(FadeIn(s0), FadeIn(s12), FadeIn(cap), run_time=0.4)
            self.stage = [s0, s12, cap]
            c.until(1.6)
            th0 = PI / 3
            F = P(1.0, th0) * np.array([1, 1, 0])
            hs = [P(1.0, th0 + TAU * k) for k in range(3)]
            w_vals = [(math.cos((th0 + TAU * k) / 3), math.sin((th0 + TAU * k) / 3)) for k in range(3)]
            floor_dot = Dot3D(point=F, radius=0.08, color=CART)
            line = DashedLine(F + OUT * (min(h[2] for h in hs) - 0.15), F + OUT * (max(h[2] for h in hs) + 0.15), color=CART, stroke_width=3)
            pts = [Dot3D(point=hs[k], radius=0.14, color=rgb_col(arg_color(*w_vals[k]))) for k in range(3)]
            labs = [MathTex(r"w_%d" % (k + 1), color=INK).scale(0.7).move_to(hs[k] + np.array([0.35, 0, 0.1])) for k in range(3)]
            self.add_fixed_orientation_mobjects(*labs)
            self.remove(*labs)
            self.play(FadeIn(floor_dot), Create(line), run_time=c.rt(1.0))
            self.stage += [floor_dot, line]
            for k in range(3):
                c.until(3.0 + 0.6 * k)
                self.play(FadeIn(pts[k]), FadeIn(labs[k]), run_time=c.rt(0.3))
                self.stage += [pts[k], labs[k]]
            self.snap("riemann", (-3.4, -3.0, 3.4, 3.0))
            c.until(7.6)
            self.play(*[FadeOut(m) for m in [floor_dot, line, *pts, *labs]], run_time=c.rt(0.3))
            th = ValueTracker(0.001)
            marker = always_redraw(lambda: Dot3D(point=P(1.0, th.get_value()), radius=0.11, color=INK))
            drop = always_redraw(lambda: DashedLine(P(1.0, th.get_value()) * np.array([1, 1, 0]), P(1.0, th.get_value()), color=CART, stroke_width=3))
            fl = always_redraw(lambda: Dot3D(point=P(1.0, th.get_value()) * np.array([1, 1, 0]), radius=0.07, color=CART))
            trail = always_redraw(lambda: ParametricFunction(lambda a: P(1.0, a), t_range=[0, max(th.get_value(), 0.02)], color=INK, stroke_width=4))
            lap = always_redraw(lambda: Text(f"lap {min(3, int(th.get_value() / TAU) + 1)} of 3", font_size=26, color=INK).move_to(cx + UP * 2.1))
            self.add_fixed_in_frame_mobjects(lap)
            self.add(trail, marker, drop, fl)
            self.stage += [trail, marker, drop, fl, lap]
            c.until(7.9)
            self.move_camera(theta=-35 * DEGREES, added_anims=[th.animate.set_value(6 * PI)], run_time=c.rt(6.5), rate_func=linear)   # 7.9 -> 14.4
            for m in (trail, marker, drop, fl, lap):
                m.clear_updaters()
            self.play(*[FadeOut(m) for m in (marker, drop, fl, trail, lap)], run_time=c.rt(0.3))
            c.until(14.4)
            self.play(s12.animate.set_opacity(0.1), run_time=c.rt(0.8))
            # the branch 0 < theta < 2 pi: the cut sits over the positive real axis, the negative real axis is inside the sheet
            c.until(16.4)
            low = ParametricFunction(lambda s_: P(s_ ** 3, 0.0), t_range=[0.0, R3], color=WARN, stroke_width=5)
            high = ParametricFunction(lambda s_: P(s_ ** 3, 2 * PI), t_range=[0.0, R3], color=WARN, stroke_width=5)
            jump = DashedLine(P(RMAX, 0.0), P(RMAX, 2 * PI), color=WARN, stroke_width=4)
            cut_lab = Text("the cut: positive real axis", font_size=24, color=WARN).move_to(cx + UP * 2.1)
            self.fixed(cut_lab)
            self.play(Create(low), Create(high), FadeIn(jump), FadeIn(cut_lab), run_time=c.rt(1.4))
            self.stage += [low, high, jump, cut_lab]
            c.until(18.8)
            neg = ParametricFunction(lambda s_: P(s_ ** 3, PI), t_range=[0.0, R3], color=OK, stroke_width=6)
            neg_lab = Text("negative real axis: smooth", font_size=24, color=OK).move_to(cx + UP * 1.6)
            form = MathTex(r"f(z)=r^{1/3}e^{i\theta/3},\ 0<\theta<2\pi", color=INK).scale(0.8).move_to(cx + LEFT * 0.4 + DOWN * 3.1)
            self.fixed(neg_lab, form)
            self.play(Create(neg), FadeIn(neg_lab), run_time=c.rt(1.2))
            c.until(20.4)
            self.play(FadeIn(form), run_time=c.rt(0.6))
            self.stage += [neg, neg_lab, form]
            c.until(self.est("riemann") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 6 sphere
    def beat_sphere(self):
        with self.beat("sphere") as t:
            c = Clock(self, t, self.est("sphere"))
            self.put_tag("5 of 5 · sphere")
            self.set_camera_orientation(phi=68 * DEGREES, theta=-30 * DEGREES)
            Rs = 2.0
            sph = Sphere(radius=Rs, resolution=(16, 32), u_range=[0.001, TAU - 0.001], v_range=[0.001, PI - 0.001], checkerboard_colors=False)
            sph.set_fill(SURFACE, 0.35)
            sph.set_stroke(MUTED, 0.6, opacity=0.5)
            eq = ParametricFunction(lambda a: np.array([Rs * math.cos(a), Rs * math.sin(a), 0]), t_range=[0, TAU], color=SEAM, stroke_width=3)
            N = 48

            def curve_pts(a):
                return [np.array(rot_x(stereographic(*circle_z(i / N)), a)) * Rs * 1.012 for i in range(N + 1)]

            def curve(a, base, opacity=1.0):
                return self.ramp_stroke(curve_pts(a), base, width=6, opacity=opacity)

            def curve_dots(a, base):
                return VGroup(*[Dot3D(point=np.array(rot_x(stereographic(*circle_z(tt)), a)) * Rs * 1.012, radius=0.06, color=ramp(base, tt, 0.6)) for tt in (0, 0.25, 0.5, 0.75)])

            c_in = curve(0.0, INPUT)
            d_in = curve_dots(0.0, INPUT)
            npole = Dot3D(point=np.array([0, 0, Rs]), radius=0.07, color=INK)
            spole = Dot3D(point=np.array([0, 0, -Rs]), radius=0.07, color=INK)
            lab_inf = MathTex(r"\infty", color=INK).move_to(np.array([0.0, 0.0, Rs + 0.4]))
            lab_zero = MathTex(r"0", color=INK).scale(0.9).move_to(np.array([0.0, 0.0, -Rs - 0.35]))
            self.add_fixed_orientation_mobjects(lab_inf, lab_zero)
            self.play(FadeIn(sph), FadeIn(eq), FadeIn(c_in), FadeIn(d_in), FadeIn(npole), FadeIn(spole), FadeIn(lab_inf), FadeIn(lab_zero), run_time=0.4)
            self.stage = [sph, eq, c_in, d_in, npole, spole, lab_inf, lab_zero]
            c.until(0.8)
            ph = ValueTracker(0.02)
            trav = always_redraw(lambda: Dot3D(point=np.array([math.sin(ph.get_value()), 0, -math.cos(ph.get_value())]) * Rs * 1.02, radius=0.08, color=INK))
            zval = always_redraw(lambda: Text(f"z = {math.tan(ph.get_value() / 2):.1f}" if ph.get_value() < 2.9 else "z → ∞", font_size=26, color=INK).move_to(RIGHT * 5.0 + UP * 3.0))
            self.add(trav)
            self.add_fixed_in_frame_mobjects(zval)
            self.stage += [trav, zval]
            self.play(ph.animate.set_value(3.1), run_time=c.rt(4.4), rate_func=smooth)           # 0.8 -> 5.2
            trav.clear_updaters(); zval.clear_updaters()
            c.until(6.4)
            self.play(FadeOut(trav), FadeOut(zval), run_time=c.rt(0.3))
            ip = self.make_plane(RIGHT * 4.9 + UP * 0.4, 3.2, (-1, 3), (-2, 2))
            it = MathTex(r"|z-1|=1", color=INPUT).scale(0.8).next_to(ip, UP, buff=0.1)
            icirc = self.ramp_stroke([ip.c2p(*circle_z(i / 48)) for i in range(49)], INPUT, width=5)
            idots = VGroup(*[Dot(ip.c2p(*circle_z(tt)), radius=0.07, color=ramp(INPUT, tt, 0.6)) for tt in (0, 0.25, 0.5, 0.75)])
            inset = VGroup(ip, it, icirc, idots)
            self.fixed(inset)
            self.play(FadeIn(inset), run_time=c.rt(0.5))
            self.stage += [inset]
            c.until(9.6)
            self.play(Indicate(spole, scale_factor=2.0, color=INK), run_time=c.rt(0.8))
            c.until(12.8)
            axis = DashedLine(np.array([-Rs * 1.3, 0, 0]), np.array([Rs * 1.3, 0, 0]), color=INK, stroke_width=3)
            l1 = MathTex(r"1", color=INK).scale(0.8).move_to(np.array([Rs * 1.3 + 0.3, 0, 0]))
            lm1 = MathTex(r"-1", color=INK).scale(0.8).move_to(np.array([-Rs * 1.3 - 0.3, 0, 0]))
            self.add_fixed_orientation_mobjects(l1, lm1)
            self.play(Create(axis), FadeIn(l1), FadeIn(lm1), run_time=c.rt(0.8))
            self.stage += [axis, l1, lm1]
            ghost = curve(0.0, INPUT, opacity=0.35)
            self.add(ghost)
            self.remove(c_in, d_in)
            self.stage += [ghost]
            s_ = ValueTracker(0)
            moving = always_redraw(lambda: VGroup(curve(s_.get_value() * PI, mix(INPUT, OUTPUT, s_.get_value())), curve_dots(s_.get_value() * PI, OUTPUT)))
            self.add(moving)
            self.stage += [moving]
            c.until(14.0)
            self.play(s_.animate.set_value(1), run_time=c.rt(4.0), rate_func=smooth)             # 14.0 -> 18.0
            moving.clear_updaters()
            self.snap("sphere", (-3.4, -3.0, 3.4, 3.0))
            c.until(18.8)
            swap = Text("1/z swaps 0 and ∞", font_size=24, color=INK).move_to(DOWN * 3.5)
            self.fixed(swap)
            self.play(FadeIn(swap), run_time=c.rt(0.5))
            self.stage += [swap]
            c.until(20.4)
            line = DoubleArrow(ip.c2p(0.5, -1.9), ip.c2p(0.5, 1.9), buff=0, color=OUTPUT, stroke_width=5, tip_length=0.2)
            wdots = VGroup(*[Dot(ip.c2p(0.5, vv), radius=0.07, color=ramp(OUTPUT, tt, 0.6)) for tt, vv in ((0.25, 0.5), (0.5, 0.0), (0.75, -0.5))])
            wlab = MathTex(r"\mathrm{Re}\,w=\tfrac12", color=OUTPUT).scale(0.8).next_to(ip.c2p(0.5, -1.5), RIGHT, buff=0.15)
            infs = VGroup(MathTex(r"\infty", color=OUTPUT).scale(0.6).next_to(ip.c2p(0.5, 1.9), UP, buff=0.05), MathTex(r"\infty", color=OUTPUT).scale(0.6).next_to(ip.c2p(0.5, -1.9), DOWN, buff=0.05))
            res = VGroup(line, wdots, wlab, infs)
            self.fixed(res)
            self.play(FadeIn(res), run_time=c.rt(1.2))
            self.stage += [res]
            c.until(self.est("sphere") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 7 close
    def beat_close(self):
        with self.beat("close") as t:
            c = Clock(self, t, self.est("close"))
            self.set_camera_orientation(phi=0, theta=-90 * DEGREES)
            self.put_tag("five pictures, one object")
            names = ["side by side", "painted plane", "real and imaginary", "root staircase", "sphere"]
            keys = ["side", "domain", "surfaces", "riemann", "sphere"]
            widths = [3.5, 2.1, 2.1, 2.1, 2.1]
            tiles = Group()
            for nm, k, w in zip(names, keys, widths):
                im = ImageMobject(self.snaps[k])
                box = RoundedRectangle(corner_radius=0.12, width=w, height=2.3, stroke_color=SEAM, stroke_width=2, fill_color=SURFACE, fill_opacity=1)
                if im.width / im.height > (w - 0.2) / 2.1:
                    im.scale_to_fit_width(w - 0.2)
                else:
                    im.scale_to_fit_height(2.1)
                im.move_to(box.get_center())
                lab = Text(nm, font_size=20, color=INK).next_to(box, DOWN, buff=0.12)
                tiles.add(Group(box, im, lab))
            tiles.arrange(RIGHT, buff=0.18).move_to(DOWN * 0.5)
            obj = MathTex(r"\{(x,y,u,v)\;:\;w=f(z)\}", color=INK).scale(1.1).move_to(UP * 2.9)
            fan = VGroup(*[Line(obj.get_bottom() + DOWN * 0.05, g[0].get_top(), color=MUTED, stroke_width=2, stroke_opacity=0.6) for g in tiles])
            self.play(FadeIn(tiles), FadeIn(obj), FadeIn(fan), run_time=0.4)
            self.stage = [tiles, obj, fan]
            boxes = [g[0] for g in tiles]
            for k, at in enumerate([2.4, 4.8, 6.0, 8.0, 8.8]):
                c.until(at)
                self.play(*[b.animate.set_stroke(INK if i == k else SEAM, 4 if i == k else 2) for i, b in enumerate(boxes)], run_time=c.rt(0.25))
            c.until(9.6)
            self.play(*[b.animate.set_stroke(INK if i == 0 else SEAM, 4 if i == 0 else 2) for i, b in enumerate(boxes)], run_time=c.rt(0.25))
            cap_a = Text("a question about the image of a shape: read this one", font_size=24, color=INK).move_to(DOWN * 3.2)
            self.play(FadeIn(cap_a), run_time=c.rt(0.4))
            self.stage += [cap_a]
            c.until(15.6)
            cap_b = Text("turn the object, and all five are there", font_size=24, color=INK).move_to(DOWN * 3.2)
            self.play(*[b.animate.set_stroke(INK, 4) for b in boxes], FadeOut(cap_a), FadeIn(cap_b), *[ln.animate.set_stroke(INK, 2, 1.0) for ln in fan], run_time=c.rt(0.5))
            self.stage += [cap_b]
            c.until(self.est("close") - 0.1)
```

## Appendix B: `media/narration/videos/shadows-4d.json`

```json
{
  "id": "shadows-4d",
  "title": "The picture behind every picture",
  "summary": "The graph of w = f(z) needs four numbers; every picture on the site is one of its shadows: two planes tied by a clock, a painted plane, the real and imaginary surfaces, the root staircase and the sphere.",
  "station": "graph4d",
  "music": {
    "prompt": "Calm, spacious instrumental for a maths explainer: soft piano and warm synth pads, slow and curious, no drums, gentle rise when the pictures turn.",
    "seconds": 30
  },
  "segments": [
    {
      "id": "intro",
      "text": "The graph of w equals f of z needs four numbers: x and y for where z sits, u and v for where w lands. Nobody can draw four dimensions. So every picture in this course is a shadow of that one object, seen from a different side. Here are five."
    },
    {
      "id": "side",
      "text": "First shadow: two flat planes, tied by a clock. Draw a stroke on the z plane, and its image appears on the w plane, point for point. Dark is early, bright is late, so matching dots match in time. Zoom in on one dot: where f has a derivative, a tiny square stays a tiny square, turned and stretched."
    },
    {
      "id": "domain",
      "text": "Second shadow: keep only the z plane, and paint the missing numbers onto it. Where you stand is the Cartesian address of z. The colour there is the polar address of w: hue is its angle, brightness is its length. Red means along the positive real axis, black means zero. For z squared, the colours go round twice."
    },
    {
      "id": "surfaces",
      "text": "Third shadow: height u gives the real surface. Turn it a quarter turn inside four dimensions, and the height becomes v: the imaginary surface. The colour is the number we left out, and it trades places with the height. Same object, seen from a new side."
    },
    {
      "id": "riemann",
      "text": "Fourth shadow: a root. The cube root has three values at every point, and this surface holds all three. Walk once round the origin and you land on the next sheet; three laps bring you home. A branch is one sheet, cut along the positive real axis, so the root is smooth across the negative one."
    },
    {
      "id": "sphere",
      "text": "Fifth shadow: wrap the plane onto a sphere, so infinity becomes one point, the north pole. The circle through zero, centre one, radius one, lands on a circle through the south pole. Now one over z is a half-turn about the axis through one and minus one. Zero and infinity swap, and the circle opens into a line."
    },
    {
      "id": "close",
      "text": "That is five pictures, one object: two planes tied by a clock, a painted plane, the real and imaginary surfaces, the staircase, the sphere. When a question asks for the image of a shape, you are reading one shadow. Turn the object, and you can see the others."
    }
  ]
}
```

Counts: intro 51, side 59, domain 58, surfaces 46, riemann 56, sphere 58, close 48 words; total 376; estimated length 152.85 s.

## Appendix C: the validated check (becomes U6 to U14)

```js
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { colorXY, hueOf, lightnessOf } from '../../js/core/domaincolor.js';
import { stereographic, inverseStereographic, rotate4, riemannPoint, argColor, hiddenRamp, HIDDEN_RAMP_STOPS } from '../../js/core/three-view.js';

const SENTINEL = '# ---- scene: manim below this line';
const src = fs.readFileSync(new URL('../../videos/scenes/shadows-4d.py', import.meta.url), 'utf8');
const cut = src.indexOf('\n' + SENTINEL);
if (cut < 0) throw new Error('no sentinel');
const pure = src.slice(0, cut);
const tail = `
import json
pts = [[1,0],[0,1],[-1,0],[0,-1],[0,0],[4,0],[0,2],[0.75,1],[-1.25,-0.59],[3.3,0.01],[0.2,-0.1]]
out = {}
out['rgb'] = [[domain_rgb(x,y,True), domain_rgb(x,y,False)] for x,y in pts]
out['stereo'] = {k: stereographic(*v) for k, v in {'0':(0,0),'1':(1,0),'i':(0,1),'2+i':(2,1),'big':(1e9,0),'inf':(float('inf'),0)}.items()}
out['half'] = [rot_x(stereographic(2,1), math.pi), stereographic(*recip(2,1))]
out['inv'] = inverse_stereographic(*stereographic(2,1))
out['circ'] = [circle_z(t) for t in (0,.25,.5,.75,1)]
out['reflines'] = [recip(*circle_z(t))[0] for t in (0.1,0.25,0.4,0.6,0.75,0.9)]
p = (1, 0.5, 0.75, 1.0)
out['rot_pos'] = rotate_uv(p, math.pi/2); out['rot_neg'] = rotate_uv(p, -math.pi/2); out['rot0'] = rotate_uv(p, 0.0)
out['rot_sq'] = rotate_uv((1, .5) + square_fn(1, .5), -math.pi/2)
out['riem'] = riemann_point(1, math.pi/3)
out['riem_k'] = [riemann_point(1, math.pi/3 + TAU*k)[2] for k in range(3)]
out['riem_home'] = [riemann_point(1, 6*math.pi), riemann_point(1, 0)]
out['edges'] = [riemann_point(1.8, 0)[2], riemann_point(1.8, TAU)[2], riemann_point(1.8, math.pi)[2]]
out['ramp'] = [hidden_ramp(0), hidden_ramp(0.5), hidden_ramp(1)]
out['stops'] = HIDDEN_STOPS
out['argc'] = [arg_color(1,0), arg_color(-1,1e-12), arg_color(-1,-1e-12)]
out['hue'] = [hue_of(1,0), hue_of(0,1), hue_of(-1,0), hue_of(0,-1)]
out['light'] = [lightness_of(0,0), lightness_of(1,0), lightness_of(100,0)]
img = domain_image(lambda z: z*z, 2.0, 600)
out['img'] = {'shape': list(img.shape), 'dtype': str(img.dtype), 'c300_500': img[300,500].tolist(), 'c300_100': img[300,100].tolist(), 'c100_300': img[100,300].tolist(), 'c299_299': img[299,299].tolist()}
wheel = domain_image(lambda z: z, 2.0, 300, mask_radius=2.0)
out['wheel'] = {'corner_alpha': int(wheel[0,0,3]), 'centre_alpha': int(wheel[150,150,3])}
out['side'] = [[side_stroke(t), side_image(t)] for t in (0,.25,.5,.75,1)]
print(json.dumps(out))
`;
const r = spawnSync('python3', ['-I', '-c', pure + '\n' + tail], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
const o = JSON.parse(r.stdout);
const close = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const vec = (a, b, e = 1e-9) => a.length === b.length && a.every((x, i) => close(x, b[i], e));
let bad = 0;
const ok = (c, msg) => { if (!c) { bad++; console.log('FAIL', msg); } };
// A4: domain colouring equals js
const pts = [[1,0],[0,1],[-1,0],[0,-1],[0,0],[4,0],[0,2],[0.75,1],[-1.25,-0.59],[3.3,0.01],[0.2,-0.1]];
pts.forEach(([x, y], i) => { ok(JSON.stringify(o.rgb[i][0]) === JSON.stringify(colorXY(x, y, [0,0,0], true)), 'rings ' + x + ',' + y); ok(JSON.stringify(o.rgb[i][1]) === JSON.stringify(colorXY(x, y, [0,0,0], false)), 'plain ' + x + ',' + y); });
ok(vec(o.stereo['2+i'], stereographic({re:2,im:1})), 'stereo 2+i');
ok(vec(o.stereo['0'], [0,0,-1]) && vec(o.stereo['1'], [1,0,0]) && vec(o.stereo['i'], [0,1,0]), 'stereo basics');
ok(vec(o.stereo.big, [0,0,1], 1e-8) && vec(o.stereo.inf, [0,0,1]), 'stereo infinity');
ok(vec(o.half[0], o.half[1], 1e-12), 'half turn = 1/z');
ok(close(o.inv[0], 2, 1e-12) && close(o.inv[1], 1, 1e-12), 'inverse');
ok(vec(o.circ.flat(), [0,0,1,-1,2,0,1,1,0,0], 1e-12), 'circle');
ok(o.reflines.every((u) => close(u, 0.5, 1e-12)), 'Re w = 1/2');
const js = rotate4([1, 0.5, 0.75, 1.0], { uv: Math.PI / 2 });
ok(vec(o.rot_pos, js, 1e-12), 'rotate_uv = rotate4(+pi/2)');
ok(vec(o.rot_pos, [1, 0.5, -1.0, 0.75], 1e-12), 'rot +90 (x,y,-v,u)');
ok(vec(o.rot_neg, [1, 0.5, 1.0, -0.75], 1e-12), 'rot -90 (x,y,v,-u)');
ok(vec(o.rot0, [1, 0.5, 0.75, 1.0], 1e-12), 'rot 0');
ok(vec(o.rot_sq, [1, 0.5, 1.0, -0.75], 1e-12), 'z^2 at 1+0.5i: Re surface 0.75 -> Im surface 1.0');
ok(vec(o.riem, riemannPoint({n:3, part:'im'}, 1, Math.PI/3), 1e-12), 'riemann_point = riemannPoint');
ok(vec(o.riem_k, [0.3420201433256687, 0.6427876096865395, -0.984807753012208], 1e-12) && close(o.riem_k.reduce((a,b)=>a+b), 0, 1e-12), 'three sheet heights');
ok(vec(o.riem_home[0], o.riem_home[1], 1e-12), 'closes after 6pi');
ok(close(o.edges[0], 0, 1e-12) && close(o.edges[1], 1.8 ** (1/3) * Math.sin(2*Math.PI/3), 1e-12) && close(o.edges[2], 1.8 ** (1/3) * Math.sin(Math.PI/3), 1e-12) && close(o.edges[1], o.edges[2], 1e-12), 'branch edges');
[0, 0.5, 1].forEach((t, i) => ok(vec(o.ramp[i], hiddenRamp(t), 1e-12), 'hidden ramp ' + t));
ok(JSON.stringify(o.stops) === JSON.stringify(HIDDEN_RAMP_STOPS.map(([t, c]) => [t, c])), 'stops equal HIDDEN_RAMP_STOPS');
ok(vec(o.argc[0], argColor({re:1,im:0}), 1e-12) && vec(o.argc[1], o.argc[2], 1e-9), 'arg colour');
ok(vec(o.hue, [0, 0.25, 0.5, 0.75]) && vec(o.light, [0, 0.5, lightnessOf({re:100,im:0})]), 'hue/lightness');
ok(JSON.stringify(o.img.shape) === '[600,600,4]' && o.img.dtype === 'uint8', 'image shape');
ok(o.img.c300_500[0] > 200 && o.img.c300_500[1] < 90 && o.img.c300_500[2] < 90 && o.img.c300_500[3] === 255, 'red on the real axis');
ok(o.img.c100_300[1] > 200 && o.img.c100_300[2] > 200 && o.img.c100_300[0] < 90, 'cyan on the imaginary axis');
ok(o.img.c299_299.slice(0,3).every((c) => c < 30), 'dark at zero');
ok(o.wheel.corner_alpha === 0 && o.wheel.centre_alpha === 255, 'wheel mask');
ok(vec(o.side[1][0], [1, -0.7], 1e-12) && vec(o.side[1][1], [0.51, -1.4], 1e-12) && vec(o.side[2][1], [1, 0], 1e-12) && vec(o.side[0][1], [-0.96, -2.8], 1e-12), 'side stroke');
console.log(bad ? bad + ' FAILED' : 'all pure-maths checks pass', JSON.stringify(o.img));
```
