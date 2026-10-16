# Design: i2-videos-ch2

Goal `i2-videos-ch2` (iteration 2, wave 1, kind `video`, size M, depends on `i2-media-core`): two silent, captioned manim films that put Chapters 2 and 3 on one
clock. **`motion-time`** (station `mappings`): *a function is a motion with a clock*; a stroke is carried to its image on one clock, linear maps keep lines, the
line x = 2 bends into a parabola under z², the circle |z − 1| = 1 opens into the line Re w = ½ under 1/z, and on paper it is parametrize, push forward,
eliminate. **`zoom-cr`** (station `derivative`): *under the microscope a smooth map is one move*; the ring of directions, the circle of difference quotients with
centre A and radius |B|, conj z and Re z never shrink the circle, z² + z shrinks it to f′ = 2z + 1, Cauchy–Riemann is "no mirror", and |z|² is differentiable at
0 only.

Owned files (the only ones this goal may create or edit): `videos/scenes/motion-time.py`, `videos/scenes/zoom-cr.py`, `media/narration/videos/motion-time.json`,
`media/narration/videos/zoom-cr.json` and, automatically as in every goal, this file, `tests/unit/i2-videos-ch2.test.mjs` and `tests/interact/i2-videos-ch2.mjs`.
Produced by running the tools, never edited by hand: `media/video/{motion-time,zoom-cr}.{mp4,vtt}` and `media/manifest.js` (written by `tools/videos/render.mjs`),
and the review stills in `docs/review/iter-2/i2-videos-ch2/` (git-ignored). Everything this design needs from another owner is in section 9; none of it blocks the goal.

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md` ("Media track" and the design language), `docs/STORY.md` (0, 1 Thread 3 and the direction-circle table, 3, 4, 8 V3 and
V4, 10), `docs/ARCHITECTURE.md` (11.4, 11.8), `docs/goals/iter-2.json` (this goal, and the entries of `i2-videos-ch1`, `i2-videos-4d` and `i2-media-core` for the shared JSON
rules), `videos/lib/narrated.py`, `videos/lib/palette.py` (already the dark tokens, with `mix` and `ramp`), `tools/videos/render.mjs`, `tools/smoke.mjs`,
`js/core/listen.js` (the panel these films appear in), `js/core/complex.js` (the numbers), `js/registry.js` (`video: 'motion-time'` on `mappings`, `video: 'zoom-cr'` on `derivative`),
`media/narration/site/derivative.json` (the station's own narration these films must not contradict) and `css/theme.css` (the dark block).

**Status of this design.** Nothing of the goal exists in the repo yet: `videos/scenes/` and `media/narration/videos/` hold nothing, `media/manifest.js` exports empty lists. To
make the design implementable without guessing, a **throwaway prototype** of everything in it was built in a scratch directory outside the repo (informational: it may be gone
when you read this, and this document is binding where the two differ): both scene files, both narration files, the unit test of 7.2 and the interaction script of 7.3, run against the real
`js/core/complex.js`, `js/core/listen.js`, `js/registry.js`, the real `videos/lib/{narrated,palette}.py`, `tools/videos/render.mjs` (for the manifest) and `tools/smoke.mjs` (with Playwright).
The two scene sources, the narration files and the two test sources, as they ran, are the appendices (A to E); the builder may take them as the starting point. Measured results are in 7.6.

---

## 0. Decisions, discrepancies, and differences from the plan

### 0.1 Decisions a builder or reviewer might otherwise trip over

| # | Decision | Why |
|---|---|---|
| D1 | **Every beat starts by cross-fading its signature picture in, in 0.3 s, and only then animates.** No beat draws its picture from nothing. The first thing in each `beat_*` is one `Stage.cut(...)` or `Stage.put(...)` call (section 5.3) that carries the whole picture; the first beat of each film uses `Stage.place(...)` instead (no transition), so that **frame 0 is the intro card**, the poster frame the player shows before play. | A3 reviews a still at *cue start + 0.5 s*. At 15 fps 0.3 s is 5 frames, at 30 fps 9: the picture is complete before the still, whatever the quality flag. A beat that drew its stroke from nothing would show an empty plane in the one still that matters. |
| D2 | **A `Stage` of named slots with a fixed draw order** (`SLOT_Z`), and the rule that *a group is faded in and out as a whole and nothing else ever adds to, or fades, a member of it separately*. | Two manim facts found by the prototype: `FadeIn(x)` adds `x` to the scene on its own, so a mobject that is also a child of a slot group is left behind when the group fades out (stale labels from one beat sat on the next); and the order in which two simultaneous `FadeIn`s add their mobjects decides which one is drawn under the translucent plane frame (a label came out dim). `z_index` per slot removes both. |
| D3 | **The shared helpers (`Plane`, `ramped`, `Stage`, ...) are copied into each scene file**; there is no new file in `videos/lib/`. | `videos/lib/` belongs to `i2-media-core` (`palette.py`) and `narrated.py` has no owner this iteration; this goal owns only its two scene files. The duplication is about 120 lines and is identical in the two files except for what each needs. |
| D4 | **`check_numbers()` is the first statement of `construct()`** in both scenes and asserts every constant of the film against its closed form (section 6). The film cannot render with a wrong number. | A4 is a code inspection; this makes it a run-time check as well (the render fails loudly) and gives the unit test (U4) something to grep. |
| D5 | **Literal `self.beat("id")` calls**, six in `motion-time.py` and seven in `zoom-cr.py`, each inside `if self.on("id"):`. `on()` reads an optional `BEATS=ids,comma,separated` environment variable so a single beat can be re-rendered while iterating (a render of one beat takes 20 to 45 s of CPU); with `BEATS` unset (the deliverable) every beat runs. In `zoom-cr` the beats `move` and `quotient` reuse the panels of the beat before them, so filter `ring,move` or `ring,quotient`, not `move` alone. | The unit test reads the beat ids with a regex (as `i2-videos-ch1` A2 does), so a loop over ids would hide them. |
| D6 | **Colours come only from `lib.palette`**: INPUT for the z-plane stroke, OUTPUT for its image, `ramp(base, t, w)` for the clock, CART for Cartesian pieces (grid, x, y, u_x, v_y, a, b), POLAR for polar pieces (r, θ, φ, arg, the ring, the circle of quotients, "turn", "stretch"), WARN for the mirror part B and for "never shrinks", OK for "f′ exists", INK for z, z₀ and the cursors, MUTED for axes and helpers, SURFACE for plane fills, BG for the background. No literal hex colour and no manim colour constant (`RED`, `BLUE`, ...) anywhere (U2 checks both). | The two-address colour code is the teaching device (CONSTRAINTS "Design language"); `palette.py` is equal to the site's dark tokens (checked by `tests/unit/i2-media-core.test.mjs`). `SEAM` is imported but not used: no seam is shown in these two films (the negative real axis does not matter to them). |
| D7 | **Ramp weights.** Strokes use `ramp(base, t, 0.45)` (the site's `plane.js` uses 0.4: a little more here, because 480p video loses contrast), clock dots and arrow tips use 0.85 (nearly the pure ramp, so the clock reads from dark steel to white), direction arrows 0.5 and quotient dots 0.6 (so INPUT green and OUTPUT pink stay recognisable; 0.7 in the prototype read as lavender, so the fix round of 0.4 lowered it). The prototype at 0.55 turned green into teal and pink into lilac; 0.45 keeps both hues. | A3: "ramped dark to light, INPUT green, OUTPUT pink, same ramp and matching dots". |
| D8 | **Direction shading is π-periodic**: `ramp_dir(base, φ) = ramp(base, (φ mod π)/π, w)`. | The quotient (Δw/Δz) depends only on the line through z₀, not on which way along it (φ and φ + π give the same dot). Arrows φ and φ + π, and the two dots they share, get one shade; the picture itself says "opposite directions share a dot" before the narrator does. |
| D9 | **Two values of ρ.** The dots of the quotient plane in `quotient` and `abs2` are computed at `LIMIT_RHO = 1e-3` (the limit: opposite directions coincide to within a pixel), while the ring drawn in the left panel is drawn at screen radius 1.0 by zooming (`ZOOM = 20`, so ρ = 0.05). In `mirror` the dots are computed at the finite ρ that the ρ readout shows, starting at 0.10. | A circle of dots at ρ = 0.05 for \|z\|² is visibly a limaçon (the term ρe^{−iφ} is 7 % of the radius) and the pairs do not coincide; the film states the limit. In `mirror` the finite ρ *is* the point of the picture (z² + z has radius exactly ρ). |
| D10 | **One example across `ring`, `move`, `cr`: f(z) = z² + z at z₀ = ½ + ½i**, so f(z₀) = ½ + i, f′(z₀) = 2z₀ + 1 = 2 + i, \|f′\| = √5 ≈ 2.236, Arg f′ = arctan ½ = 26.565°, Jacobian [[2, −1], [1, 2]]. `quotient` and `abs2` use \|z\|² (`quotient` at the same z₀, `abs2` from 1.2 + 0.9i to 0); `mirror` uses conj z, Re z and z² + z at z₀. | Continuity: the same ring, then the same number f′ = 2 + i, then its four partials. All the numbers are exact and small. Only the three examples named by A4 (conj z, z² + z, \|z\|²) plus Re z (P6, the same table in STORY) appear. |
| D11 | **Narration is frozen at 326 words (motion-time, 6 segments) and 358 words (zoom-cr, 7 segments)**, each segment 12 to 60 words, predicted silent lengths **132.5 s** and **145.65 s** (section 5.1; zoom-cr was 352 words and 143.25 s until the fix round of 0.4, which added one clause to `quotient`). Digits are allowed in these texts (the station narration of `i2-media-core` D11 spells numbers out; A2 here requires "4y" and "2z plus 1"). | A1 wants 120 to 180 s; narrated.py gives `max(1.5, words / 2.5) + 0.35` s per beat, so 450 words would be 182 s and the real ceiling is about 443 words. 326 and 358 leave 34 to 47 s of headroom under 180 s for the voiced version (which is timed by the clips). |
| D12 | **`Text` never contains a subscript digit or a superscript** (U+2080, U+00B2): every symbol with a subscript or an exponent is a `MathTex` built once. `Text` may contain Greek letters, `×`, `−`, `°` and `→`. | `Text` is typeset by Pango with whatever font the machine has; a missing subscript glyph silently falls back to a different font. |
| D13 | **Live numbers never run LaTeX per frame.** A number that changes (the clock `t = 0.02`, `θ = Arg z = 27°`, `ρ = 0.10`, the zoom factor, `r = \|z\| = 0.39 → 1/r = 2.57`) is `Text` rebuilt by `always_redraw`, or a `MathTex` label built once next to a `DecimalNumber` (`live_number`, zoom-cr). A moving label is one `MathTex` with an updater that moves it. | The first prototype rebuilt `MathTex` every frame: the shared `Tex` cache grew to about 1,400 files over a few renders and a 720p render was still compiling its 880th string when it was stopped. With `Text` and `DecimalNumber` a full 480p render of the longer film takes about 2 minutes. |
| D14 | **Render one film at a time and never run two `manim` processes against the same `--media_dir`.** `render.mjs` renders its ids one after another into `build/manim`, so `npm run videos` and `render.mjs --only a,b` are safe; two builders running `render.mjs` at the same moment share `build/manim/Tex` and can collide. | Observed: two manim processes with one media directory died with `latex failed but did not produce a log file` (the same TeX file written by both). The Tex cache is content-addressed, so a re-run reuses every finished file: if the message ever appears, run the same command again. For iteration, call `manim` directly with a private `--media_dir` (7.1). |
| D15 | **Both films keep the same frame**: 16:9, 14.22 × 8 scene units; header row at y = 3.55; plane titles at y = 2.72; two plane boxes of 6.2 × 5.2 centred at (−3.75, −0.2) and (3.75, −0.2) with the input on the left; footer at y = −3.45. | One layout, learnt once; it is the layout of the site's side-by-side planes (z-plane left, w-plane right). |

### 0.2 Discrepancies in the goal text, and how this design resolves them

| # | Discrepancy | Resolution (binding for the builder and both reviews) |
|---|---|---|
| S1 | A2 says total words 300 to 450 and A1 says 120 to 180 s. With 7 segments, 450 words is 182.5 s. | The two ranges are met together at the designed 326 and 358 words. U1b pins the per-segment counts, so the length cannot drift out of 120 to 180 s unnoticed. |
| S2 | A3 reviews every still at *cue start + 0.5 s* and expects the finished picture (the ramped stroke and its image, the parabola with the focus, the point near 0 flying off, the three steps, the ring, the dashed circle, two panels, the matrix). A picture that is drawn on during the beat would not be there yet. | D1: each picture is on screen within 0.3 s and the beat animates *on* it (the clock cursor, the zoom, the sweeping direction). Where the goal wants a *change* (abs2, "two stills 3 s apart") the change starts at once and is fast enough to be visible: 7.4 gives the readouts of both stills. |
| S3 | A3 for `mirror`: "z² + z (a single point labelled f′ = 2z + 1)" at +0.5 s, yet the shrinking of its circle is the idea. | ρ starts at 0.10, so at +0.5 s the right panel is a ring of radius 0.2 scene units (18 px at 720p) around a green point labelled f′ = 2z + 1, and it tightens to 0.04 units by the end; the left panel's circle stays at radius 2.0 units while the ρ readout falls from 0.10 to 0.02. `abs2` is where a large circle visibly shrinks to a point. |
| S4 | A3 says `mirror` shows "two panels", and the narration of `mirror` (STORY V4) also mentions Re z (P6). | The left panel is conj z at +0.5 s and swaps to Re z (circle of centre ½, radius ½) at 0.4 t + 0.3 s; the right panel is z² + z throughout. Two panels in every still; P6 is on screen and spoken. |
| S5 | A4: "the constants appear in the code as formulas or as these values, not as other numbers." The scenes also contain *inputs* (z₀ = ½ + ½i, the stroke, the window scales, 1.2 + 0.9i). | A and B are always computed from the partials by `AB(f, z0)` (zoom-cr) and every film constant (4, 16, ½, 2z + 1, conj z0, z0, √5, 26.565°, the Jacobian) is asserted in `check_numbers()`. Inputs are inputs: they pick the example, they are not results. |
| S6 | `assignment_refs` lists 1.5.1 and 3.2.1, which are not the subject of a beat. | 1.5.1: the `paper` card "1 Parametrize" shows z(t) = a + t(b − a) (and section 6.2 works the problem, z(t) = (2 − 5t) + i(1 − 4t)); the `stroke` narration says a stroke is "z of t, with t running from 0 to 1". 3.2.1: the `cr` beat shows the Cauchy–Riemann equalities, the matrix [[a, −b], [b, a]] and f′ = u_x + i v_x verified on z² + z; the e^x(cos y + i sin y) check is the station's job (`derivative.json` "exp"), and section 6.2 works it in both addresses with the numbers that U5 asserts. |
| S7 | A2 gives a total only; `i2-videos-ch1` A2 adds 12 to 60 words per segment. | The stricter bound is used for both films (U1), so the three video goals read alike. |
| S8 | A3 says "two stills 3 s apart, radius smaller in the later one" for `abs2` without saying which times. | +0.5 s and +3.5 s: the readout `\|B\| = \|z₀\| = ` shows 1.48 and 1.12 and the dashed circle's radius ratio is 0.76 (7.4). |

### 0.3 Differences between ARCHITECTURE and the code on disk (the code wins)

- ARCHITECTURE 11.8 and the goal say "300 to 450 words at 2.5 words per second, 2 to 3 minutes". `narrated.py` adds a 0.35 s pad per beat and `ffprobe` measures the frame-rounded result: 132.40 s and 143.13 s for the prototypes at 480p15 (predicted 132.50 and 143.25; the fix round of 0.4 lengthened zoom-cr to a predicted 145.65 s), the same at 720p30. The usable ceiling is therefore about 443 words, not 450.
- `tools/videos/render.mjs` renders into one shared `build/manim` and its `writeManifest()` lists **every** `videos/scenes/<id>.py` that has an mp4, so the manifest this goal produces also lists whatever `two-addresses`, `staircase-roots` and `shadows-4d` have been rendered by the time it runs. `media/manifest.js` is regenerated by the last render; the integrator re-runs `node tools/videos/render.mjs --manifest-only` after all three video goals.
- `videos/lib/palette.py` already holds the 13 dark tokens and the helpers `mix` and `ramp` (media-core D10, signature `ramp(base, t, weight=0.4)`); it has no `SEAM` use here.
- `videos/lib/narrated.py`: `beat()` yields `t = max(1.5, words / 2.5) + 0.35` and pads with `self.wait`; the renderer's clock advances by whole frames, so a beat ends within one frame of its length. A play or wait of `run_time <= 0` raises `ValueError` in manim 0.22 and one shorter than a frame is raised to a frame with a warning: every `run_time` here is at least 0.03 t (0.45 s at the shortest beat).
- `tools/smoke.mjs`'s static server has no MIME entry for `.mp4` or `.vtt` and no `Range` support. The interaction script re-serves those two kinds with the right `Content-Type` through `page.route` (as GitHub Pages does), and does not need `Range`.
- The harness's Chromium (Playwright) cannot decode H.264: a `<video>` pointed at these files ends in `error`, which `listen.js` turns into `data-state="error"` and the "did not load" line. The script accepts that and checks structure and cues only (7.3).
- `docs/review/**/*.png` is git-ignored: the stills are for the reviewers, not for the repository. `media/video` is *not* ignored (the orchestrator decides whether to commit the mp4 files).

### 0.4 Fix round (iteration 2, after review A): what changed in the code, and what the appendices no longer say

Review A found one major and seven minor issues. All were fixed except where noted; **Appendices A to E are the prototype as it ran and are not rewritten: where a file of the repository differs from them, the file wins, and
the differences are exactly the ones below.**

| # | Review finding | Change | Where |
|---|---|---|---|
| F1 (major) | `square`: `θ = Arg z` and `2θ = Arg w` were rounded separately (28° beside 55°; 49 % of the frames of the 20° to 42° sweep were inconsistent) | θ is rounded **once** to a whole number of degrees (`whole_theta()`), and the second readout prints `2 * whole_theta()`, so the second is always exactly twice the first (27° and 54°, 28° and 56°). The ray still moves continuously; the readout moves in whole degrees. | `motion-time.py` `beat_square` |
| F2 | `recip`: `-0` at the instant θ crosses 0 | helper `whole(x)`: `n = int(round(x))`, `0` for `n == 0`, a real minus sign otherwise; both readouts use it, so the crossing frame reads `θ = Arg z = 0°  →  −θ = 0°` | `motion-time.py` `whole`, `beat_recip` |
| F3 | `move`: the label `Arg f′ = 26.6°` was drawn over image arrows; `abs2`: `A = z̄₀` crossed the dots once the circle was small | `move`: the label (size 28) is in the top-right corner of the box, outside the ring, mirroring `|f′|ρ = √5 ρ` in the top-left; `abs2`: the label rides **above** the circle at `max(0.42, |z₀|·1.25 + 0.32)` over the centre (below it would leave the frame at the start, where the circle has radius 1.85) | `zoom-cr.py` `beat_move`, `beat_abs2` |
| F4 | zoom-cr's `Stage` had no `freeze`; `mirror` typed the radii (2.0, 1.0) and the labels `1`, `½` | `Stage.freeze` added (parity with motion-time); `mirror` takes `A, B = AB(f_conj, Z0)` and `AB(f_re, Z0)` and draws the circle at `QL.pt(A)` with radius `abs(B) * QL.scale`, the radius segment to `A + |B|`, and the label from `tex_half(abs(B))`; no radius or `|B|` value is typed any more | `zoom-cr.py` `Stage`, `tex_half`, `beat_mirror` |
| F5 | `recip`: cursor ring on the top edge and on the arrowhead; `linear`/`square`/`paper`: tick label `2` under the end dot, arrowhead at the top edge | `recip`: `clamp = BOX_H/2 − 0.2` (2.4) and the two "to infinity" arrows end at v = ±1.65 (tips 0.25 below the parked cursor); the line x = 2 is drawn for `|y| ≤ LINE_Y = 2.2` (`linear`, `square`) and `|y| ≤ PAPER_Y = 1.4` (`paper`), so the end dots and the arrowhead are 0.4 inside the frame and clear of the tick label and the top edge. The parabola is then `v = ±8.8` at its ends (`square`) and ±5.6 (`paper`). | `motion-time.py` `LINE_Y`, `PAPER_Y`, `beat_recip` |
| F6 | `quotient`: A and B were named but the narration never said what the quotient tends to | one clause added: "The quotient tends to A plus B times e to the minus 2 i phi: one dot per direction, tracing a circle." The segment has **59 words** (limit 60); zoom-cr is now 358 words and a predicted **145.65 s** (was 352 and 143.25 s). `tests/unit/i2-videos-ch2.test.mjs` U1b was updated to match (59 and 145.65). | `zoom-cr.json`, the test |
| F7 | `move` sub-line said `z0`; quotient dots read as lavender | sub-line now `multiply by f prime of z zero` (as spoken); `DOT_W` 0.7 to 0.6 (quotient, mirror and abs2 dots) | `zoom-cr.py` |
| F8 | process: private-media-dir render, literal `--quality l` not run, the manifest lists the other video goals' films, two failures of other goals in `npm test` | this round the two films were rendered through `node tools/videos/render.mjs --only motion-time,zoom-cr` (see the build report); the manifest still lists every film that has an mp4 (7.1: re-run `--manifest-only` last); the two other failures (ARCHITECTURE 3.12 `helixPoint`, `i2-decisions-everywhere-b` "H3 fix round") are not this goal's | the integrator |

Not changed, on purpose: the two shared layers (`Plane`, `Stage`, helpers) are still duplicated in the two scene files (D3); `Stage.freeze` is unused in zoom-cr and is there only so both copies are the same.

---

## 1. Goal restatement, story thread, problems and topics covered

**Goal.** Produce two rendered, captioned, **silent** 720p videos of 2 to 3 minutes and under 15 MB each (`media/video/motion-time.mp4` + `.vtt`, `media/video/zoom-cr.mp4` + `.vtt`),
each a manim scene `class Main(NarratedScene)` paired with a narration script, and regenerate `media/manifest.js`. The voice is added later on the student's machine; the build loop
renders silent videos whose captions are the narration, so a silent render must already teach.

**Story thread carried.** Spine lines 3 and 4 as film (STORY section 0).

- *Line 3, "A function moves every point at once"* is `motion-time`. A stroke z(t), 0 ≤ t ≤ 1, is carried to f(z(t)) **on the same clock**: the stroke is shaded dark to light, the image
  wears the identical shading and the identical dots at t = 0, ¼, ½, ¾, 1, and a cursor rides both at once. Functions built from slides keep lines (iz − 2i: one turn and one slide, the
  line x = 2 lands on the real axis); functions built from moves keep circles and rays but bend a line (z²: x = 2 becomes the parabola u = 4 − v²/16 with focus 0, and in polar r → r², θ → 2θ);
  1/z inverts the length and flips the angle, so a circle through 0 opens into a line because 0 goes to ∞ (|z − 1| = 1 becomes Re w = ½). On paper the same story is three steps.
- *Line 4, "Differentiable means: up close, one move"* is `zoom-cr`. Zoom in and the curved grid comes out straight, turned and stretched; a ring of directions is sent to a ring; that
  number is f′(z₀), a complex number with a Cartesian address (u_x + iv_x = 2 + i) and a polar address (√5 e^{i·26.6°}: stretch and turn); every direction must agree, and the quotient from direction
  φ is the dot A + B e^{−2iφ}, a circle of centre A and radius |B|; B is the mirror part; conj z and Re z keep a circle, z² + z has none (f′ = 2z + 1), Cauchy–Riemann is the same sentence in x and y
  (u_x = v_y, u_y = −v_x, the matrix [[a, −b], [b, a]]), and |z|² has a circle of radius |z₀| that is a point only at 0.
- *The two addresses and the two decisions* show on screen as the colour code (CART blue: Cartesian pieces; POLAR orange: r, θ, φ, arg, circles, turn, stretch) and as the "Cartesian" and "polar" columns under
  `move` and `cr`. **arg versus Arg**: every angle that appears says which it is (`θ = Arg z`, `2θ = Arg w`, `Arg f′ = 26.6°`, and `φ ∈ arg Δz` for the direction, any name of it works).

**How each beat carries it** (segment id, spine line, what the student sees at +0.5 s, problems and topics):

| Film | Beat | Line | Signature picture (on screen by +0.5 s) | Problems / topics |
|---|---|---|---|---|
| motion-time | `intro` | 3 | z-plane lattice of 15 dots, w-plane with their 15 images under z² on their way (arcs follow) | T2.1 |
| | `stroke` | 3 | the stroke z(t) in INPUT green ramped dark to light with dots at ¼ marks, its image in OUTPUT pink with the same ramp and dots, a dashed link between the two cursors, the clock bar | 1.5.1 (z(t)), T2.1 |
| | `linear` | 3 | the line x = 2 on the z-plane; on the w-plane a copy of it with the basis arrows 1 and i, carried by a quarter turn then a slide of −2i onto the real axis | 2.1.3, P3, T2.1 |
| | `square` | 3 | the vertical line x = 2 and its parabola u = 4 − v²/16 with the focus marked at 0; then a ray and a circle show r → r², θ → 2θ | 2.1.2, T2.1 |
| | `recip` | 3 | the circle \|z − 1\| = 1 with 0 marked and the line Re w = ½ clearly off the v-axis, the cursor near 0 with its image flown off to ∞ | 2.5.1, T2.5 |
| | `paper` | 3 | the same planes small, above three cards: 1 Parametrize, 2 Push forward, 3 Eliminate y | 2.1.2, 1.5.1, T2.1 |
| zoom-cr | `intro` | 4 | straight grid at z₀ on the left, the curved image grid of z² + z on the right, "zoom ×1" going to ×20: the right grid straightens | T3.1 |
| | `ring` | 4 | a ring of 24 arrows around z₀ and the ring of their images around f(z₀) | 3.1.1, T3.1 |
| | `move` | 4 | the same rings with the turn (Arg f′ = 26.6°) and the stretch (\|f′\|ρ = √5 ρ), and the two columns "Cartesian f′ = u_x + iv_x = 2 + i", "polar f′ = √5 e^{i 26.6°}" | 3.1.1, T3.1 |
| | `quotient` | 4 | 24 dots on the dashed circle of centre A with the radius \|B\| drawn, a highlighted pair of opposite arrows on the ring | 3.1.2, T3.1 |
| | `mirror` | 4 | two panels: conj z (circle of radius 1, "never shrinks") and z² + z (a point, f′ = 2z + 1), then Re z (P6) replaces conj z on the left | 3.1.1, 3.1.2, P6, T3.1 |
| | `cr` | 4 | u_x = v_y, u_y = −v_x, "no mirror part", the matrix [[a, −b], [b, a]], the tiny square turning into a turned, stretched square | 3.2.1, T3.2 |
| | `abs2` | 4 | z₀ on its way to 0, the dashed circle of centre z̄₀ and radius \|z₀\| shrinking to the point f′(0) = 0 | 3.1.2, T3.1 |

Review problems covered, with the section that works each one in both addresses: **1.5.1, 2.1.2, 2.1.3, 2.5.1, 3.1.1, 3.1.2, 3.2.1, P6** (section 6.2). Topics: **T2.1, T2.5, T3.1, T3.2**.

---

## 2. UX

A film has one control, the browser's own player, and a fixed picture in every frame. This section gives the player's controls and states (the element ids are `listen.js`'s), the frame layout
for desktop and phone, one wireframe per beat (what is on screen at +0.5 s and what then moves), and every word that appears, spoken or written.

### 2.1 What the student controls

The films are embedded by `i2-decisions-everywhere-b` (`mappings`) and `-c` (`derivative`) through `videoPanel(container, 'motion-time' | 'zoom-cr')` from `js/core/listen.js`, after the station's first
picture, headed "Watch (2–3 min)". This goal builds nothing in the DOM; it supplies the files the panel needs and checks the panel against them (7.3). The ids below are the ones `listen.js` writes
(`<id>` is `motion-time` or `zoom-cr`).

| Element id | What it is | Label / content | Behaviour |
|---|---|---|---|
| `video-<id>` | `section.panel.video-panel` | heading `Watch (2–3 min): <film title>` in `#video-<id>-title` | exists only when `media/manifest.js` lists the film; `data-state` is `loading`, then `ready` or `error`; `data-narrated="false"` until the audio run |
| `video-<id>-summary` | `p.muted` | the manifest summary, then `133 s` (or `146 s`), then `Silent, with captions` | describes the player (`aria-describedby`); after the audio run it ends `With voice and captions` |
| `video-<id>-player` | `video[controls][playsinline][preload=metadata]`, 16:9, 100 % of the panel width | native controls: play/pause, seek bar, time, captions (CC), full screen, speed menu | **Pointer**: click the picture or the play button to play or pause, drag the seek bar to any beat; **touch**: tap to show the controls, tap play; **keyboard**: Tab focuses the player, Space or K plays and pauses, ← → seek 5 s, J L seek 10 s, ↑ ↓ volume, F full screen, C captions (where the browser offers it), Esc leaves full screen. Nothing autoplays. |
| `source[src$=".mp4"]` | the film | `media/video/<id>.mp4` | H.264, yuv420p, 1280 × 720 at 30 fps (the 480p15 check render is the same pictures) |
| `track[kind=captions][default]` | English captions | `media/video/<id>.vtt`: one cue per beat, the narration verbatim | on by default, so the silent film teaches; the browser draws them at its own size, which is what makes the film readable on a phone |
| `video-<id>-error` | `p[role=alert]`, hidden | "The video did not load. Everything else on this page works without it." | shown only on a media error, with the video hidden |

**Pause is the second control.** Every beat is built so that a pause at any moment is a legible study card (a labelled picture with its formula), and the first half-second of every beat is that
card complete. A student who scrubs to a beat and pauses gets the picture of that place in the story.

### 2.2 The frame (both films)

The frame is 16:9, 14.22 × 8 scene units (1280 × 720 at 720p: 90 px per unit; 854 × 480 at 480p: 60 px per unit). Scene units: x to the right, y up, origin at the centre.

```
 x:  -7.11                            0                              +7.11
 y= 3.55  Headline (34 pt, INK, left)                  sub-line (24 pt, MUTED, right)     <- slot head
 y= 2.72          z = x + iy                                   w = u + iv                  <- titles (36 pt)
 y= 2.40  +-----------------------------+          +-----------------------------+
          | LEFT PLANE: the input z     |    f     | RIGHT PLANE: the output w   |           boxes 6.2 x 5.2
          |  strokes INPUT green        |  ----->  |  strokes OUTPUT pink        |           centres (-3.75,-0.2)
          |  frame MUTED, fill SURFACE  |  links   |  same                       |                    ( 3.75,-0.2)
 y=-2.80  +-----------------------------+          +-----------------------------+
 y=-3.45   FOOT-LEFT: the formula, readout, or a column      FOOT-RIGHT: clock bar, readout, or a column   <- slot foot
```

On the phone the player is 358 px wide inside a 390 px viewport (the panel's 16 px side padding), so the frame is 25.2 px per scene unit and the video 358 × 201 px:

```
 +------------------ 358 px ------------------+      cap heights at this width (font_size -> px):
 | A stroke carries a clock   the image keeps |      headline 34 -> 8.7 px      formulas 34-60 -> 9 to 15 px
 |   z = x + iy              w = u + iv       |      labels 26-30 -> 6.6-7.6 px  tick labels 18 -> 4.6 px
 | +---------------+       +---------------+  |
 | |   (6.2 x 5.2) |  -->  |               |  |      Full screen (the player's own control) gives 3 to 4 times the pixels;
 | +---------------+       +---------------+  |      the captions are drawn by the browser at its own size.
 |  z(t), 0<=t<=1        t [=====]  t = 0.02  |
 +--------------------------------------------+
```

Legibility rule for the phone, kept by every label: the film is a raster, so **nothing is carried only by text smaller than font_size 26** (the 18 pt tick labels are decoration; the plane scale is also
readable from the grid), and **every meaning carried by colour is also carried by a word or a shape** (the clock by the readout `t = 0.02` and the dots, INPUT/OUTPUT by the plane, WARN/OK by "never shrinks" and
"f′ = 2z + 1").

### 2.3 One wireframe per beat (the picture at +0.5 s, then what moves)

Legend: `o` start dot, `*` the cursor (white ring), `>` arrowhead at t = 1, `....` dashed link, `[##]` clock bar, `(C)` CART blue, `(P)` POLAR orange, `(W)` WARN, `(OK)` OK green.

**motion-time**

```
intro   A function is a motion                          it picks up every point
        z = x + iy                                     w = u + iv
        +------------------------+                     +------------------------+
        |   . . .                |   arcs of the 15    |        .                |   15 INPUT dots (3 x 5 lattice, x = 0.5 1 1.5, y = -1.5 .. 1.5)
        |   . . .                |   dots follow       |     .     .  .          |   15 OUTPUT dots land at z^2 (LaggedStart, 0.35 t)
        |   . . .   -> f ->      |   (0.15 t)          |   .    .  . .           |   then faint arcs join each pair
        +------------------------+                     +------------------------+
        f(z) = z^2

stroke  A stroke carries a clock                        the image keeps the clock
        +------------------------+                     +------------------------+
        |   o~~ S-curve ~~>      |  *.................*|  loop-like image  >    |   stroke ramped INPUT, image ramped OUTPUT, dots at 0 1/4 1/2 3/4 1
        +------------------------+                     +------------------------+   both cursors ride t: 0 -> 1 in 0.8 t, linked by a dashed line
        z(t), 0 <= t <= 1                              t [########=====]  t = 0.02

linear  Linear: one turn, one slide                     lines stay lines
        +------------------------+                     +------------------------+
        |        |  x = 2        |                     |  copy of the line + basis arrows 1 (C), i (C), origin ring
        |        |               |                     |  turn: x i    -> (P) quarter turn about 0   (0.15 t, after 0.2 t)
        +------------------------+                     |  slide: -2i   -> (C) shift down 2           (0.13 t)
        w = iz - 2i = i(z - 2)                         +------------------------+   ends on the real axis; "x = 2 -> v = 0"

square  z squared: a line bends                         x = 2 becomes a parabola
        +------------------------+                     +------------------------+
        |        |  x = 2        |                     |      u = 4 - v^2/16    |   parabola with dots; "focus 0" ring at the origin
        |        |               |   *.......*         |   focus 0              |   cursors sweep t (0.38 t), then the line fades to 20 %
        +------------------------+                     +------------------------+   and a ray + circle show r -> r^2, theta -> 2 theta (P)
        w = z^2   t [###]                              theta = Arg z = 20 -> 42 deg, 2 theta = Arg w, r = 2.5, r^2 = 6.25

recip   1/z: a circle opens into a line                 zero goes to infinity
        +------------------------+                     +------------------------+
        |   |z - 1| = 1           |                     |   |   Re w = 1/2      |   circle through 0 (0 marked), line 0.65 units (58 px at 720p) right of the v-axis
        |  0 *  ring ring        |   *..............   |   | to infinity       |   cursor starts at t = 0.05 near 0, its image is at the top edge;
        +------------------------+                     +------------------------+   sweep to t = 0.95 (0.8 t): the image runs down the line to -infinity
        r = |z| = 0.39 -> 1/r = 2.57  (P)               t [#=========]
        theta = Arg z = -79 deg -> -theta = 79 deg (P)

paper   On paper: three steps                           parametrize, push forward, eliminate
        z = x + iy                                      w = u + iv          (planes 6.2 x 3.6, centres y = +0.9)
        +------------------------+                     +------------------------+
        |   x = 2, dots, cursor  |                     |   parabola, focus ring |
        +------------------------+                     +------------------------+
        +----------------+  +----------------+  +----------------+
        | 1 Parametrize  |  | 2 Push forward |  | 3 Eliminate y  |    cards 4.35 x 2.3 at y = -2.5; a POLAR frame moves 1 -> 2 -> 3 -> all
        | z = 2 + iy     |  | u = 4 - y^2    |  | y = v/4        |    with the narration (wait 0.27 t, 0.06 t move, 0.15 t cursor sweep, ...)
        | z(t)=a+t(b-a)  |  | v = 4y         |  | u = 4 - v^2/16 |
        +----------------+  +----------------+  +----------------+
```

**zoom-cr**

```
intro   Zoom in                                         up close, the bending goes away
        z                                              w = f(z)
        +------------------------+                     +------------------------+
        |  straight square grid  |                     |  curved image grid of z^2 + z, k = 1 -> 20 (0.6 t, smooth, log scale)
        |        z0              |                     |        f(z0)           |   at k = 20 the right grid is a straight lattice, turned and stretched
        +------------------------+                     +------------------------+
        f(z) = z^2 + z            zoom x1 -> x20         "turned and stretched" (P) appears at the end

ring    A ring of directions                            where does f send each step?
        z = z0 + dz                                    w = f(z0 + dz)
        +------------------------+                     +------------------------+
        |     \ | /  24 arrows    |                     |   image ring (circle of 24 arrows, 2.24 x bigger, turned)
        |   -- z0 --  (INPUT)    |                     |   (OUTPUT); one white arrow sweeps phi 0 -> 2 pi (0.6 t) on both, with a POLAR arc
        +------------------------+                     +------------------------+
        dz = rho e^{i phi}   phi in arg dz

move    One move up close                               multiply by f prime of z zero
        (same rings)                                    turn (P) arc and "Arg f' = 26.6 deg"; "|f'| rho = sqrt5 rho" (P); phi = 0 arrow in white
        Cartesian (C)  [appears at 0.63 t]              polar (P)  [appears at 0.83 t]
        f'(z0) = u_x + i v_x = 2 + i                    f'(z0) = sqrt5 e^{i 26.6 deg}

quotient One dot per direction                          the dots trace a circle
        (left ring stays; white pair of     +------------------------+
         opposite arrows turns)             |  dashed circle (P), 24 dots (12 distinct), centre A (P), radius segment |B| (W)
                                            |  a big white dot rides the circle twice while the pair turns once
        opposite arrows, same dot           +------------------------+   dw/dz -> A + B e^{-2 i phi}  (A P, B W, e^ P)

mirror  B is the mirror part                            no mirror, no circle
        +---- conj z: A = 0, B = 1 ----+                +-- z^2 + z: A = 2z + 1, B = 0 --+
        |  dashed circle radius 1 (P)  |                |      f' = 2z + 1 (OK)          |   rho 0.10 -> 0.06 (0.4 t); left swaps to Re z (A = 1/2, B = 1/2,
        |  |B| = 1 (W)                 |                |   ring of dots shrinks         |   |B| = 1/2) with a 0.1 t cross-fade; rho -> 0.02 (0.4 t)
        +------------------------------+                +--------------------------------+
        never shrinks (W)                               rho = 0.10

cr      Cauchy-Riemann                                  no mirror: one turn, one stretch
        u_x = v_y         (C)                           a tiny square
        u_y = -v_x        (C)                +------------------------+
        no mirror part    (OK)               |  unit square (INPUT) turning into its turned, stretched image (OUTPUT)
        [[u_x u_y],[v_x v_y]] = [[a -b],[b a]]  |  arc 26.6 deg (P);   a = 2, b = 1 (C)
                                             +------------------------+   the square turns after 0.4 t (0.35 t)
        Cartesian f' = u_x + i v_x = 2 + i  and  polar f' = sqrt5 e^{i 26.6 deg} appear at 0.75 t and 0.85 t

abs2    Absolute value squared                          the circle shrinks to 0
        z                                              dw/dz
        +------------------------+                     +------------------------+
        |   z0 --------> 0       |                     |  dashed circle (P) centre A = conj z0 (P) shrinking to the point f'(0) = 0 (OK)
        +------------------------+                     +------------------------+   |B| = |z0| = 1.48 -> 0.00 (W), z0 moves linearly in 0.65 t
        f(z) = |z|^2
```

### 2.4 States

| State | What the student sees | Where it is handled |
|---|---|---|
| Not rendered yet / not in the manifest | no panel at all; the station works fully (CONSTRAINTS: a station must work without media) | `videoPanel` resolves `null` |
| Loading | the panel with a grey 16:9 box and the heading and summary line; `data-state="loading"`; `preload="metadata"` fetches the first bytes only | `listen.js` |
| Ready, paused | the first frame, which is the poster the player shows: the `intro` card (a lattice of green dots, or the straight and curved grids at ×1) | the film (`Stage.place` on the first beat) |
| Playing | the narration as captions (the `<track default>`), the picture moves; no sound until the audio run | the film |
| Captions off | the pictures still carry their labels and formulas | on-screen text (2.5) |
| Error (file missing, 404, or a browser without H.264) | the video is hidden and the line "The video did not load. Everything else on this page works without it." is shown | `listen.js` |
| After the audio run | the same film with the voice mixed in; beats are as long as the clips plus 0.35 s; `data-narrated="true"`, summary ends "With voice and captions" | `narrated.py` (every `run_time` is a fraction of `t`, so the animation re-times itself) |

### 2.5 The copy

**Spoken and captioned text** (the segment texts, verbatim; they are the JSON of section 4.2). Plain, direct, short sentences, both addresses said out loud, every number spoken as the student would say it.

*motion-time* (6 segments, 326 words, predicted 132.5 s)

1. `intro` (47 words, 19.15 s): "A function picks up every point of the plane and puts it down somewhere else. On the left is the input, the z-plane. On the right is the output, the w-plane. Every question in this chapter asks one thing: where does this shape land, and why there?"
2. `stroke` (54, 21.95 s): "Now draw a stroke. A stroke is a point moving: z of t, with t running from 0 to 1. Colour it by the clock, dark at the start and light at the end. Push every point through the function, and the image keeps the clock. Same shades, same dots, so when matches where."
3. `linear` (54, 21.95 s): "Linear maps are the simplest motions. The map w equals i z minus 2 i turns the whole plane a quarter turn, then slides it down 2. Lines stay lines. Watch the vertical line x equals 2: it lands flat on the real axis. One turn and one slide, for every point at once."
4. `square` (55, 22.35 s): "Now square it. Push the line x equals 2 forward, with y as the clock, and it bends into a parabola with its focus at 0. Why? In polar, z squared squares the length and doubles the angle, so circles stay circles and rays stay rays. In Cartesian, a straight line is not so lucky."
5. `recip` (60, 24.35 s): "One over z inverts the length and flips the angle. The circle through 0 is z equals 2 cos theta times e to the i theta, so 1 over z is one half minus i over 2 times tan theta. Real part one half: Re w equals one half. Zero goes to infinity, so the circle opens into a line."
6. `paper` (56, 22.75 s): "On paper it is three steps. Parametrize: z equals 2 plus i y, with y as the clock. Push forward: u equals 4 minus y squared, and v equals 4y. Eliminate y: y is v over 4, so u equals 4 minus v squared over 16. Same parabola. Every image question goes parametrize, push forward, eliminate."

*zoom-cr* (7 segments, 358 words, predicted 145.65 s)

1. `intro` (38, 15.55 s): "Put a point under a microscope. Far away, a function bends the plane. Up close, the bending disappears, and the grid comes out straight, only turned and stretched. That is what differentiable will mean: one move, up close."
2. `ring` (47, 19.15 s): "Around the point z zero, draw a tiny ring of directions. Each arrow is a step, delta z, with length rho and angle phi. Now ask where the function sends each step. The ring goes in on the left, and its image comes out on the right."
3. `move` (55, 22.35 s): "If the ring comes out as a ring, turned and stretched by one number, then up close the function is one move: multiplication by f prime of z zero. That number is complex, so it has two addresses. In Cartesian, u sub x plus i v sub x. In polar, a stretch and a turn."
4. `quotient` (59, 23.95 s): "A move treats every direction alike, so divide each image step by its input step. The quotient tends to A plus B times e to the minus 2 i phi: one dot per direction, tracing a circle. Its centre A is the move part. Its radius is the size of B, the mirror part. Opposite directions share a dot."
5. `mirror` (53, 21.55 s): "B is the mirror part. Conjugation is pure mirror: its circle has radius 1 and never shrinks, however closely you look. The real part squashes the plane, with radius one half: same story. But z squared plus z has no mirror. Its circle shrinks to a single point, the derivative, 2z plus 1."
6. `cr` (58, 23.55 s): "In x and y, no mirror reads: u sub x equals v sub y, and u sub y equals minus v sub x. That is Cauchy-Riemann. It says the four partials make the matrix a, minus b, b, a: a turn and a stretch, nothing else. Then the derivative is u sub x plus i v sub x."
7. `abs2` (48, 19.55 s): "Now the absolute value of z, squared. Its circle has centre the conjugate of z zero and radius the length of z zero. It shrinks to a point only when z zero reaches 0. So it is differentiable at 0, with derivative 0, and nowhere else. Analytic nowhere."

**Written text on the frame** (every string; none is needed to follow the narration, all of them make a paused frame a study card). Headline | sub-line, in `Text`, ASCII except where noted:

| Film / beat | Headline | Sub-line | Other labels (MathTex unless noted) |
|---|---|---|---|
| mt / intro | A function is a motion | it picks up every point | z = x + iy, w = u + iv, f, f(z) = z² |
| mt / stroke | A stroke carries a clock | the image keeps the clock | z(t), 0 ≤ t ≤ 1; `t`, `0`, `1`, `t = 0.00 … 1.00` (Text) |
| mt / linear | Linear: one turn, one slide | lines stay lines | x = 2 (INPUT); w = iz − 2i = i(z − 2); turn: × i (P); slide: −2i (C); x = 2 ↦ v = 0 (OUTPUT) |
| mt / square | z squared: a line bends | x = 2 becomes a parabola | x = 2; u = 4 − v²/16; `focus 0` (Text); w = z²; clock; θ = Arg z = 20…42°, 2θ = Arg w = 40…84° (Text); r = 2.5; r² = 6.25 |
| mt / recip | 1/z: a circle opens into a line | zero goes to infinity | \|z − 1\| = 1; Re w = ½; `0`, `to infinity` ×2 (Text); r = \|z\| = 0.39 → 1/r = 2.57 and θ = Arg z = −79° → −θ = 79° (Text); clock |
| mt / paper | On paper: three steps | parametrize, push forward, eliminate | cards: `1  Parametrize` z = 2 + iy, z(t) = a + t(b − a); `2  Push forward` u = 4 − y², v = 4y; `3  Eliminate y` y = v/4, u = 4 − v²/16 |
| zc / intro | Zoom in | up close, the bending goes away | z, w = f(z), z₀, f(z₀), f(z) = z² + z, `zoom ×1 … ×20`, `turned and stretched` (Text) |
| zc / ring | A ring of directions | where does f send each step? | z = z₀ + Δz, w = f(z₀ + Δz), z₀, f(z₀), `zoom ×20`, Δz = ρe^{iφ}  φ ∈ arg Δz |
| zc / move | One move up close | multiply by f prime of z zero | ρ, \|f′\|ρ = √5 ρ, Arg f′ = 26.6°; `Cartesian` f′(z₀) = u_x + iv_x = 2 + i; `polar` f′(z₀) = √5 e^{i 26.6°} |
| zc / quotient | One dot per direction | the dots trace a circle | Δw/Δz, A, \|B\|, Δw/Δz → A + Be^{−2iφ}, `opposite arrows, same dot` (Text) |
| zc / mirror | B is the mirror part | no mirror, no circle | z̄: A = 0, B = 1; \|B\| = 1; `never shrinks`; z² + z: A = 2z + 1, B = 0; f′ = 2z + 1; `ρ = 0.10 … 0.02` (Text); then Re z: A = ½, B = ½; \|B\| = ½; `Re z: never shrinks either` |
| zc / cr | Cauchy-Riemann | no mirror: one turn, one stretch | u_x = v_y; u_y = −v_x; `no mirror part`; the two matrices; a tiny square; a = 2, b = 1; the two columns of `move` |
| zc / abs2 | Absolute value squared | the circle shrinks to 0 | z, Δw/Δz, z₀, `0`, A = z̄₀, \|B\| = \|z₀\| = 1.47 … 0.00, f(z) = \|z\|², f′(0) = 0 |

---

## 3. Visual encoding

### 3.1 Roles, tokens and values (the film is always the dark theme)

`videos/lib/palette.py` holds the dark tokens of `css/theme.css` (`BG` #0d121c, `SURFACE` #151c2b, `INK` #e9edf5, `MUTED` #a6b0c3, `CART` #62adf2, `POLAR` #ff9d5c, `INPUT` #3fd0a0, `OUTPUT` #e48fd2,
`SEAM` #8e99b0, `T0` #5c7498, `T1` #f3f6fb, `WARN` #ff8178, `OK` #63d08a). The scenes import the names and never write a value. Contrast against `BG` (WCAG relative luminance, computed): INK 15.97, MUTED 8.59, CART 7.84,
POLAR 9.13, INPUT 9.59, OUTPUT 8.17, WARN 7.73, OK 9.75; the darkest end of a stroke, `ramp(INPUT, 0, 0.45)` #4ca79c, is 6.53 and `ramp(OUTPUT, 0, 0.45)` #a783b8 is 5.87, so the "dark" end of the clock is still above 4.5:1.

| Role (the same marks as on the site, STORY section 4) | Token | Used for |
|---|---|---|
| Background; plane fill (55 % opacity); plane frame and axes (axes 75 %, grid 18 %, frame 80 %) | BG; SURFACE; MUTED | frame, planes, tick labels (18 pt) |
| The point z, z₀, the cursor rings and dots, the white highlight arrows, headlines, formulas of f | INK | one dot, drawn once, always white |
| z-plane strokes, the ring of directions | INPUT, shaded with `ramp` | `stroke`, `linear`, `square`, `recip`, `paper`; the 24 arrows in `ring`, `move`, `quotient` |
| w-plane strokes, the image ring, the dots of the quotient plane, the turned square | OUTPUT, shaded with `ramp` | the images in all beats |
| The clock | `T0` to `T1` mixed with the stroke hue (`ramp`); the bar itself is the pure `mix(T0, T1, t)` | strokes, dots at 0, ¼, ½, ¾, 1, the arrowhead at 1, the clock bar |
| Cartesian: x, y, u, v, Re, Im, the grid, partials, a and b, "slide" | CART | `x = 2`, u = 4 − y², v = 4y, u_x = v_y, the basis arrows 1 and i, the grid in the zoom, "Cartesian" column |
| Polar: r, θ, φ, arg, circles, rays, "turn", "stretch", A (the move part) | POLAR | the ray and circle of `square`, the readouts of `recip`, the angle arcs, the dashed circle of quotients and its centre A, "polar" column |
| The mirror part B, "never shrinks", the radius \|B\| | WARN | \|B\| segment and label, "never shrinks", the \|B\| readout of `abs2` |
| "f′ exists" (a point, f′(0) = 0), "no mirror part" | OK | the green point and its label, "no mirror part" |
| The seam | SEAM | not used: no seam appears in these films |

Unused-colour rule: nothing else is coloured. Whenever a formula is shown its Cartesian pieces are CART and its polar pieces POLAR (`Δw/Δz → A + Be^{−2iφ}`: A and e^{−2iφ} POLAR, B WARN).

### 3.2 The time ramp, the dots, the direction shading

- **Stroke at parameter t** (`ramped`): short round-capped segments, each `ramp(base, (k + ½)/(n − 1), 0.45)`: INPUT #4ca79c (t = 0) to #90e1c9 (t = 1), OUTPUT #a783b8 to #ebbde4. Stroke width 6.
- **Dots at t = 0, ¼, ½, ¾, 1** (`clock_dots`): radius 0.085, `ramp(base, t, 0.85)`, a 2-pixel BG outline; INPUT #588299 … #d8f0ed, OUTPUT #7078a1 … #f1e7f5. The arrowhead at t = 1 is a filled triangle of 0.13 in the same colour as the last dot, pointing along the motion.
- **The cursor** (`cursor`): a white ring (radius 0.17, width 3) with a white dot (0.08); a dashed MUTED link (width 1.5, opacity 0.6) joins the two cursors, so *when* matches *where* is a line you can see.
- **The clock bar** (`clock_bar`): 48 rectangles of `mix(T0, T1, k)`, 3.8 units wide and 0.17 high, a white triangle marker, and the readout `t = 0.02`.
- **Direction arrows** (zoom-cr): `ramp_dir(base, φ) = ramp(base, (φ mod π)/π, 0.5)`; arrows are 3.5 wide with 0.16 tips; the highlighted arrow is INK, width 8. Quotient dots `ramp_dir(OUTPUT, φ, 0.6)`, radius 0.085 with a BG outline.
- **Clipping**: a curve that leaves a plane's box is cut at the box (segments with an end outside are skipped, 3 px of margin); the film never draws outside a frame. Where a point leaves (the image of a point near 0 under 1/z) the cursor is clamped to the frame edge and an arrow labelled "to infinity" says where it went.

### 3.3 Sizes

| Item | font_size or width | Cap height at 720p (px) |
|---|---|---|
| Headline | 34 (Text, INK) | 31 |
| Sub-line | 24 (Text, MUTED) | 22 |
| Plane titles (MathTex) | 36 | 33 |
| Formulas in the foot, labels on the planes | 34 to 40 (MathTex); equations of `cr` 60, matrix 44 | 31 to 55 |
| Live readouts | 26 to 30 (Text) | 24 to 27 |
| Tick labels | 18 (Text, MUTED) | 16 |
| Stroke 6, ring arrows 3.5, highlight arrows 8, dashed circle 3 (48 dashes), axes 2, grid 1 | | |

### 3.4 Light theme, dark theme, reduced motion

The film is rendered once, in the dark palette, and is shown the same in both site themes (a video is a picture): in the light theme it is a dark rectangle inside the panel, whose own text, border and background come from the
tokens (`listen.js` gives the `<video>` a `--surface-2` background while it loads). Nothing in the film changes with the page theme; the contrast figures of 3.1 are against the film's own background.
Reduced motion: nothing autoplays (the player starts paused), nothing flashes (the only blink is one `Indicate` of 0.15 t on the turn arc, a single pulse), and no motion is faster than about 2.5 scene units per second; section 8.4.

### 3.5 arg versus Arg, and the point drawn once

Whenever an angle is shown the film says which one it is. `θ = Arg z` and `2θ = Arg w` (square), `θ = Arg z → −θ` (recip: the home value, θ in (−90°, 90°)), `Arg f′ = 26.6°` (move), and the direction `φ ∈ arg Δz` (any name works, because
A + Be^{−2iφ} has period π in φ). The point z, z₀ and the cursor are drawn once as one white dot.

---

## 4. Module API

There is no JavaScript here and no station code: the "modules" are two manim scene files, two narration files, and the generated files the site reads. Python 3.13 with manim Community v0.22.0
(`~/.venvs/manim/bin/manim`, found by `render.mjs`), `latex` and `dvisvgm` on the PATH, `ffmpeg` and `ffprobe`.

### 4.1 Files and what each exports

| File | Exports | Imports |
|---|---|---|
| `videos/scenes/motion-time.py` | `class Main(NarratedScene)` is the only name `render.mjs` uses (`manim ... motion-time.py Main`); everything else is module-private | `cmath`, `math`, `os`, `numpy`, `from manim import *`, `from lib.narrated import NarratedScene`, `from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, T0, T1, WARN, OK, mix, ramp` (`PYTHONPATH` includes `videos/`, set by `render.mjs`) |
| `videos/scenes/zoom-cr.py` | `class Main(NarratedScene)` | the same |
| `media/narration/videos/motion-time.json`, `zoom-cr.json` | the data of 4.2 | read by `narrated.py`, `tools/media/generate-audio.mjs`, `tools/videos/render.mjs` (`writeManifest`) |
| `media/video/<id>.mp4`, `<id>.vtt`, `media/manifest.js` | written by `render.mjs` and `NarratedScene.tear_down`; the `VIDEOS` entry is `{ id, title, summary, station, src, captions, seconds, narrated, music }` (ARCHITECTURE 11.4) | read by `js/core/listen.js` |

### 4.2 The narration JSON (data structure; the full texts are in 2.5 and appendix C)

```json
{ "id": "motion-time", "title": "A function is a motion with a clock",
  "summary": "A stroke carries a clock and its image keeps it. Linear maps keep lines, the line x = 2 bends into a parabola under z squared, and the circle |z - 1| = 1 opens into the line Re w = 1/2 under 1/z. On paper: parametrize, push forward, eliminate.",
  "station": "mappings",
  "music": { "prompt": "Calm, curious ambient piano with soft pulsing synth pads, slow tempo, a sense of gentle steady motion, no vocals, loopable", "seconds": 30 },
  "segments": [ { "id": "intro", "text": "..." }, { "id": "stroke", "text": "..." }, { "id": "linear", "text": "..." }, { "id": "square", "text": "..." }, { "id": "recip", "text": "..." }, { "id": "paper", "text": "..." } ] }

{ "id": "zoom-cr", "title": "The microscope, the direction circle, and no mirror",
  "summary": "Put a point under a microscope: a ring of directions, one turn and one stretch, the circle of difference quotients with centre A and radius the size of B, no mirror means Cauchy-Riemann, and |z|^2 is differentiable at 0 only.",
  "station": "derivative",
  "music": { "prompt": "Quiet, focused ambient texture with a slow rising arpeggio and soft bell tones, a feeling of zooming in, no vocals, loopable", "seconds": 30 },
  "segments": [ { "id": "intro" }, { "id": "ring" }, { "id": "move" }, { "id": "quotient" }, { "id": "mirror" }, { "id": "cr" }, { "id": "abs2" } ] }
```

Rules (U1): `id` equals the file stem; `title` non-empty; `summary` at least 40 characters (the panel shows it); `station` equals the registry station whose `video` field is the id (`mappings`, `derivative`);
`music.prompt` at least 20 characters and `music.seconds` 30 (20 to 40 allowed); segments in the order above, ids matching `/^[a-z0-9-]+$/`, 12 to 60 words each, no `$` or backslash (the text is spoken);
the segment ids are exactly the `self.beat("...")` ids of the scene, in the same order, each once.

### 4.3 The scene contract (both files)

```python
class Main(NarratedScene):
    narration_id = "motion-time"                  # or "zoom-cr": the stem of media/narration/videos/<id>.json
    def setup(self):                              # super().setup() first (loads the JSON); then:
        self.camera.background_color = BG         #   the film's background
        self.st = Stage(self)                     #   the slots of 4.5
        self.only = {s for s in os.environ.get("BEATS", "").split(",") if s}   # empty: every beat
    def on(self, beat_id: str) -> bool            # True when no filter is set or beat_id is in it
    def construct(self) -> None:                  # check_numbers() first, then one guarded block per beat, in JSON order
        check_numbers()
        if self.on("intro"):
            with self.beat("intro") as t:         # t: float seconds this beat lasts (narrated.py)
                self.beat_intro(t)
        ...
    def beat_<id>(self, t: float) -> None         # builds the picture, swaps it in, then animates; every run_time is a fraction of t
```

Lifecycle. manim calls `setup`, then `construct`, then `tear_down`; `NarratedScene.tear_down` prints the unused segments and writes `media/video/<id>.vtt` (these scenes add no `tear_down`). There is no
cleanup to do: no file, socket, thread or global state is opened, and the `Stage` holds mobjects only. A re-render is idempotent (`--disable_caching`, same output paths). Events: none (nothing external drives
the scene); its only clock is `NarratedScene`'s beat boundaries, which come from the words (silent) or from the clip lengths (voiced), and the `ValueTracker` of each beat.

Mount and unmount of the *panel* (the only DOM involved) belong to `listen.js` and the station: `videoPanel(container, id)` appends one `section#video-<id>` to the station's section, so unmounting the station removes the `<video>` with it (the download and playback stop), and nothing about the film outlives it: no window listener, no timer, no store key.

### 4.4 Helper signatures

`videos/scenes/motion-time.py` (the layer is duplicated, with the additions below, in `zoom-cr.py`):

```python
RAMP_W = 0.45; DOT_W = 0.85; BOX_W, BOX_H = 6.2, 5.2; LEFT_C, RIGHT_C = (-3.75, -0.2), (3.75, -0.2); CLOCK_TS = (0.0, 0.25, 0.5, 0.75, 1.0); Y_TITLE, Y_FOOT = 2.72, -3.45
def check_numbers() -> None                                   # AssertionError on any wrong constant (section 6)
class Plane:                                                  # `focus` (complex) sits at the box centre; `scale` screen units per unit
    def __init__(self, centre: tuple[float, float], focus: complex = 0j, scale: float = 1.0, box: tuple[float, float] = (BOX_W, BOX_H))
    def pt(self, z: complex) -> np.ndarray                    # [x, y, 0] in scene units
    def inside(self, z: complex, pad: float = 0.0) -> bool    # inside the box with `pad` units of margin
    def axes(self) -> VGroup                                  # frame + ticks and grid (nice step) + axes through 0 + tick labels kept 0.35 clear of the corners
def ramped(plane, zs: Sequence[complex], base: str, width: float = 6.0, weight: float = RAMP_W) -> VGroup
def clock_dots(plane, zfun: Callable[[float], complex], base: str, ts: Sequence[float] = CLOCK_TS) -> VGroup
def end_tip(plane, zfun, base: str, t: float = 1.0) -> Triangle
def cursor(plane, zfun, clock: ValueTracker, clamp: float | None = None) -> VGroup     # follows zfun(clock) by an updater; clamp = max |y - plane.cy| in units
def link(a: Mobject, b: Mobject) -> Mobject                                            # always_redraw DashedLine between two centres
def clock_bar(tracker: ValueTracker, centre: tuple[float, float] = (3.25, Y_FOOT), width: float = 3.8) -> VGroup
def plane_titles(left: str = r"z = x + iy", right: str = r"w = u + iv") -> tuple[MathTex, MathTex]
def headline(main: str, sub: str | None = None) -> VGroup
SLOT_Z: dict[str, int]
class Stage:
    def __init__(self, scene)
    def place(self, **slots: VGroup) -> None                           # put groups on the stage at once, no transition (the first beat only)
    def put(self, run: float = 0.3, **slots: VGroup | None) -> None    # replace the named slots only, in one play of `run` seconds
    def cut(self, run: float = 0.3, **slots: VGroup | None) -> None    # like put, and clear every slot not named
    def freeze(self, name: str) -> None                                # clear the updaters of one slot (it stops moving, stays drawn)
```

`videos/scenes/zoom-cr.py` adds:

```python
ARROW_W = 0.5; DOT_W = 0.6; Z0 = complex(0.5, 0.5); ZOOM = 20.0; RING_R = 1.0; RHO = RING_R / ZOOM; LIMIT_RHO = 1e-3; N_DIR = 24; PHIS = [2*pi*k/N_DIR for k in range(N_DIR)]
def f_zz(z), f_conj(z), f_abs2(z), f_re(z)                    # z^2 + z, conj z, |z|^2, Re z; each accepts a complex or a numpy array
def AB(f, z0: complex, h: float = 1e-6) -> tuple[complex, complex]       # A = (f_x - i f_y)/2, B = (f_x + i f_y)/2, from central differences
def quotient(f, z0: complex, rho: float, phi: float) -> complex          # (f(z0 + rho e^{i phi}) - f(z0)) / (rho e^{i phi})
def runs(P: np.ndarray, plane, pad: float = 0.03) -> list[np.ndarray]    # split screen points into the runs that stay inside the box
def polyline(P: np.ndarray, color, width: float = 3, opacity: float = 1.0) -> VMobject
def grid_image(plane, f, z0: complex, zoom: float, n: int = 3, opacity: float = 0.8, samples: int = 161, faint: bool = False) -> VGroup
def ramp_dir(base: str, phi: float, w: float = ARROW_W) -> str            # ramp(base, (phi mod pi)/pi, w)
def live_number(tex: str, fn: Callable[[], float], pos, decimals: int = 2, font_size: int = 36, color=INK) -> VGroup   # MathTex label + DecimalNumber that follows fn()
def two_columns(cart_tex: str, polar_tex: str, y: float = -3.42) -> tuple[VGroup, VGroup]                       # "Cartesian" (CART) and "polar" (POLAR) columns
class Main: def micro_left(self) -> tuple[Plane, VGroup]; def micro_right(self, f=f_zz) -> tuple[Plane, VGroup]    # the two microscope panels shared by ring, move, quotient
```

### 4.5 The stage: slots, draw order, and the state after each beat

Draw order by `z_index` (`SLOT_Z`): `left`, `right` 0 (frames, grids, axes, titles) < `mid`, `cards`, `data_l`, `data_r` 1 < `lx`, `rx` and the unnamed default 2 < `lab`, `focus` 3 < `cur` 4 <
`over`, `over2`, `polar`, `ring` 5 < `head`, `foot`, `foot2` 6. Within a slot, children draw in the order of the `VGroup`.

| Film / beat | Opening call | Slots on the stage after it | Slots added or replaced later in the beat |
|---|---|---|---|
| mt / intro | `place` | head, left (axes, title, 15 dots), right (axes, title), mid (arrow, f, 15 ghost dots), foot | over (the 15 arcs) |
| mt / stroke | `cut` | head, left, right, data_l, data_r, mid (link), cur, foot (formula + clock bar) | none |
| mt / linear | `cut` | head, left, right, data_l, data_r (the mover), lab, foot | over (turn label, then slide label), over2 (end label) |
| mt / square | `cut` | head, left, right, data_l, data_r, lab, mid, cur, focus, foot | polar act: cur, mid, lab cleared, foot replaced, polar added; data dimmed to 20 % then restored |
| mt / recip | `cut` | head, left, right, data_l, data_r, lab, mid, cur, foot (readout + clock bar) | none |
| mt / paper | `cut` | head, left, right, data_l, data_r, cur, cards, ring | ring replaced three times, then three frames |
| zc / intro | `place` | head, left, right, foot | rx ("turned and stretched") |
| zc / ring | `put` | head, left (z panel), right (w panel), lx (highlight arrow + arc), rx (image arrow), foot | none |
| zc / move | `put` | head; left and right persist; lx, rx replaced; foot, foot2 cleared | foot (Cartesian column), foot2 (polar column) |
| zc / quotient | `put` | head, right (quotient plane), lx (pair), rx (circle, dots, A, \|B\|, rider), foot; left persists; foot2 cleared | none |
| zc / mirror | `put` | head, left, right (two quotient planes), lx (conj z), rx (z² + z), foot | lx replaced by Re z |
| zc / cr | `put` | head, left (equations), right (plane), lx cleared, rx (squares), foot, foot2 cleared | foot, foot2 |
| zc / abs2 | `put` | head, left, right, lx (z₀), rx (circle, dots, A), foot, foot2 cleared | rx replaced by the final point |

A beat that starts with `cut` leaves nothing of the previous beat on the stage. A beat that starts with `put` names every slot it changes, and the table above is the contract: no slot outlives a beat by accident.

---

## 5. Algorithms

Everything is numbered pseudocode; the appendices (A and B) are the same algorithms as they ran. Scene units throughout (14.22 × 8 frame). `t` is the beat length passed by `NarratedScene.beat`.

### 5.1 Beat length, time budget, frame rounding

1. `narrated.beat(id)` computes `t = max(1.5, words(segment) / 2.5) + 0.35` seconds when no clip `media/audio/videos/<film>/<id>.mp3` exists, else `t = clip_duration + 0.35` and mixes the clip in.
2. Inside the block every animation has `run_time = k · t` with a fixed fraction `k` (the cross-fades of `Stage` are the exception: 0.3 s, always shorter than any `t`). The fractions of a beat add up to 0.5 to 0.9, so a beat never overruns; the context manager pads the rest with one `self.wait`. The smallest fraction is 0.03 t (0.47 s at the shortest silent beat, 7 frames at 15 fps).
3. The renderer advances in whole frames (`dt = 1/15` at `-ql`, `1/30` at `-qm`): a play of `run_time` r renders `ceil(r/dt)` frames, a frozen wait `floor(r/dt)`. A beat therefore ends within one or two frames of `t`, and the cue times that come out of the prototype are within 0.1 s of the sums below.
4. The VTT is written from the renderer's clock at each block's entry and exit, so captions and picture cannot drift apart, voiced or silent.

| Film | Beat | Words | Silent `t` (s) | Cue start (s) | Sum of fractions used (+0.3 s opening) |
|---|---|---|---|---|---|
| motion-time | intro | 47 | 19.15 | 0.00 | 0.50 |
| | stroke | 54 | 21.95 | 19.15 | 0.80 |
| | linear | 54 | 21.95 | 41.10 | 0.59 |
| | square | 55 | 22.35 | 63.05 | 0.84 |
| | recip | 60 | 24.35 | 85.40 | 0.80 |
| | paper | 56 | 22.75 | 109.75 | 0.85 |
| | (total) | 326 | **132.50** | | |
| zoom-cr | intro | 38 | 15.55 | 0.00 | 0.70 |
| | ring | 47 | 19.15 | 15.55 | 0.60 |
| | move | 55 | 22.35 | 34.70 | 0.88 |
| | quotient | 59 | 23.95 | 57.05 | 0.60 |
| | mirror | 53 | 21.55 | 81.00 | 0.90 |
| | cr | 58 | 23.55 | 102.55 | 0.90 |
| | abs2 | 48 | 19.55 | 126.10 | 0.75 |
| | (total) | 358 | **145.65** | | |

The first beat of each film has no 0.3 s opening (`Stage.place`: the film starts on its intro card).

Voiced version (later, on the student's machine): the clip lengths replace the words/2.5 estimate; every position in 5.4 and 5.5 is a fraction of `t`, so the animation keeps its proportions. A voice at 3 words per second shortens a beat by about 17 %; the cross-fade (0.3 s) and the 0.5 s still rule stay valid at any `t` above 1.5 s.

### 5.2 Geometry and drawing helpers

**Plane.** `pt(z) = (cx + (Re z − Re focus)·scale, cy + (Im z − Im focus)·scale, 0)`; `inside(z, pad)` is `|px − cx| ≤ w/2 − pad and |py − cy| ≤ h/2 − pad`.

**Plane.axes().**
1. `hx = w/2/scale`, `hy = h/2/scale`; the window is `[Re focus ± hx] × [Im focus ± hy]`.
2. Step `s` = the first of 1, 2, 5, 10, 20 with `s·scale ≥ 0.85` (else 50).
3. For each integer `k` with `k·s` inside the window horizontally: `x = k·s`; skip `x = 0`; skip a tick whose screen x is within 0.35 of the box's left or right edge; else draw a vertical grid line (MUTED, width 1, opacity 0.18) and the label `Text(str(x), 18, MUTED)` 0.17 above the bottom edge (minus signs are U+2212). Same for `y` with the label `f"{y}i"` 0.27 right of the left edge.
4. Draw the axes through 0 when inside the window (MUTED, width 2, opacity 0.75). The frame is a `Rectangle(w, h)` with MUTED stroke 1.5 (opacity 0.8) and SURFACE fill (opacity 0.55) drawn first.

**ramped(plane, zs, base, width, weight)** (the stroke with a clock).
1. `n = len(zs)`; `P[k] = plane.pt(zs[k])`; the parameter of segment `k` is `t_k = (k + ½)/(n − 1)`, **the index fraction (the clock), not arc length**.
2. For `k = 0 … n − 2`: if both ends are `inside(·, 0.03)` add `Line(P[k], P[k + 1], stroke_width = width, color = ramp(base, t_k, weight), cap_style = ROUND)`; otherwise skip it (the curve is cut at the box).
3. Sample counts: 241 for `stroke` and `square`; 101 for the `linear` line; 201 for `paper`; 301 for `recip` (`t` from 0.004 to 0.996 so 1/z never divides by 0).

**clock_dots / end_tip / cursor / link / clock_bar.**
1. `clock_dots`: for `t` in `(0, ¼, ½, ¾, 1)`: `z = zfun(t)`; if `inside(z, 0.06)` add `Dot(pt(z), 0.085, ramp(base, t, 0.85), BG outline 2)`.
2. `end_tip`: `d = zfun(1) − zfun(0.99)`; a `Triangle` (fill = colour of the t = 1 dot, scale 0.13) rotated by `atan2(d.imag, d.real) − π/2` (the triangle points up at angle 0), centred on `pt(zfun(1))`.
3. `cursor`: a `VGroup(Circle(0.17, INK, 3), Dot(0.08, INK))` with an updater `m.move_to(clamp_y(plane.pt(zfun(clock.get_value()))))`; `clamp_y` limits `y` to `cy ± clamp` when `clamp` is given (`recip`: 2.4 = BOX_H/2 − 0.2, so the ring of the cursor stays inside the frame), which parks the image of a point near 0 on the frame edge beside the "to infinity" arrow.
4. `link(a, b)`: `always_redraw(DashedLine(a.center, b.center, MUTED, 1.5, opacity 0.6, dash 0.12))`.
5. `clock_bar(tracker)`: 48 rectangles of width `3.8/48` coloured `mix(T0, T1, (i + ½)/48)`, labels `t`, `0`, `1`, a white triangle marker at `x = cx − w/2 + tracker·w` (always_redraw) and `Text(f"t = {tracker:.2f}", 26, INK)` 0.95 right of the bar (always_redraw).

### 5.3 The stage

`Stage.put(run, **slots)`:
1. `anims = []`.
2. For each `(name, new)`: `old = slots.get(name)`; if `old`: clear the updaters of every mobject in `old`'s family and append `FadeOut(old)`. If `new`: `new.set_z_index(SLOT_Z.get(name, 2))` and append `FadeIn(new)`. `slots[name] = new`.
3. If `anims`: one `scene.play(*anims, run_time = run)`.

`Stage.place(**slots)`: for each `(name, new)`: `new.set_z_index(SLOT_Z.get(name, 2))`, `scene.add(new)`, `slots[name] = new`: no transition (the first beat of each film, so that frame 0 is the intro card).

`Stage.cut(run, **slots)`: `names = set(slots_on_stage) | set(kw)`; `put(run, **{n: kw.get(n) for n in names})`: every slot not named is cleared. `Stage.freeze(name)`: clear the updaters of the slot's family (a cursor stops where it is).

Rules: a slot group is built **before** it is put, with every child already inside it; nothing calls `scene.add`, `FadeIn` or `FadeOut` on a child; a beat that needs a different picture in a slot puts a new group (see D2).

### 5.4 motion-time, beat by beat

Common: `L` and `R` are `Plane`s centred at `LEFT_C` and `RIGHT_C`; `clock` is a `ValueTracker`. "Spoken" is the sentence window at 2.5 words per second (silent timing) the step is placed against.

**intro** (t = 19.15 s). `L = Plane(LEFT_C, focus 1, scale 1)`, `R = Plane(RIGHT_C, focus 0, scale 0.5)` (f = z²: the images reach |v| = 4.5); the 15 points are `x ∈ {0.5, 1, 1.5}`, `y ∈ {−1.5, −0.75, 0, 0.75, 1.5}`.
1. `place` (frame 0 is this picture): head ("A function is a motion" | "it picks up every point"), left (axes, title, 15 INPUT dots of 0.09), right (axes, title), mid (a MUTED arrow from (−0.45, 0.2) to (0.45, 0.2), the label `f`, 15 "ghost" dots, INPUT green like the dots they sit on, that turn OUTPUT pink as they fly), foot (`f(z) = z²`, centred). Spoken 0 to 6 s: "A function picks up every point ... somewhere else."
2. `LaggedStart(Transform(ghost_k, Dot(R.pt(z_k²), 0.09, OUTPUT), path_arc = −0.7), lag_ratio 0.05)`, `run_time = 0.35 t`.
3. `put(run = 0.15 t, over = 15 × ArcBetweenPoints(L.pt(z_k) + (0.12, 0), R.pt(z_k²) − (0.12, 0), angle −0.7, MUTED, width 1.2, opacity 0.45))`. Spoken 6 to 12.4 s: "On the left is the input ... On the right is the output ..."

**stroke** (t = 21.95 s). `zin(s) = (0.5 + 2s) + 1.4i·sin 2πs`, `zout = zin²`; `L = Plane(LEFT_C, focus 1.5, scale 1)`, `R = Plane(RIGHT_C, focus 2.6 − 1.4i, scale 0.55)`; the image runs from 0.25 to 6.25 on the real axis through (−0.96, 2.8) and (2.04, −5.6).
1. `cursors cz, cw` follow `zin(clock)` and `zout(clock)`; `cut`: head ("A stroke carries a clock" | "the image keeps the clock"), left (axes, title), right (axes, title), data_l (`ramped(L, zin(241 samples), INPUT)`, `clock_dots`, `end_tip`), data_r (the same for `zout`, OUTPUT), mid (`link(cz, cw)`), cur (cz, cw), foot (`z(t), 0 ≤ t ≤ 1` at the left, `clock_bar(clock)` on the right).
2. `play(clock → 1, run_time = 0.8 t, linear)`: 0.3 to 17.8 s. Spoken: "A stroke is a point moving" (1.6 s), "dark at the start and light at the end" (8 to 13.6 s), "the image keeps the clock" (13.6 to 18.4 s): the cursor passes dark to light and the image cursor keeps pace.

**linear** (t = 21.95 s). `zin(s) = 2 + i(−LINE_Y + 2·LINE_Y·s)`, `LINE_Y = 2.2` (the line x = 2, |y| ≤ 2.2: its end dots and arrowhead stay 0.4 inside the frame, clear of the tick label `2` and the top edge); `L = Plane(LEFT_C, focus 0, scale 1)`, `R = Plane(RIGHT_C, focus 0, scale 1)`.
1. `mover = VGroup(ramped(R, zin, OUTPUT), clock_dots, end_tip, Arrow(R.pt(0), R.pt(1), CART, 5), Arrow(R.pt(0), R.pt(i), CART, 5), Circle(0.12, INK))` (the line copy sits where the input line is, the two basis arrows are 1 and i, the ring is the origin). `cut`: head ("Linear: one turn, one slide" | "lines stay lines"), left (axes, title), right (axes, title), data_l (INPUT line, dots, tip), data_r (`mover`), lab (`x = 2`, INPUT, at (2.6, 2.1)), foot (`w = iz − 2i = i(z − 2)`).
2. `wait(0.2 t)` (4.4 s). 3. `put(0.03 t, over = "turn: × i", POLAR, at the right foot)`. 4. `Rotate(mover, π/2, about_point = R.pt(0), smooth)`, `0.15 t` (about 5.35 to 8.65 s; spoken "turns the whole plane a quarter turn" 6.0 to 8.8 s).
5. `put(0.03 t, over = "slide: −2i", CART)`. 6. `mover.animate.shift(DOWN · 2 · R.scale)`, `0.13 t`, smooth (about 9.3 to 12.2 s; spoken "then slides it down 2. Lines stay lines." 8.8 to 12.0 s). 7. `put(0.05 t, over2 = "x = 2 ↦ v = 0", OUTPUT, at (4.75, 1.7))` (spoken "it lands flat on the real axis" 12.0 s).

**square** (t = 22.35 s). `zin(s) = 2 + i(−LINE_Y + 2·LINE_Y·s)`, `LINE_Y = 2.2`, `zout = zin²`; `L = Plane(LEFT_C, focus 0.8, scale 1)`, `R = Plane(RIGHT_C, focus 0, scale 0.25)` (the box shows |v| ≤ 10.4, |u| ≤ 12.4; the parabola reaches v = ±8.8).
1. `cut`: head ("z squared: a line bends" | "x = 2 becomes a parabola"), left, right, data_l, data_r (as in stroke, 241 samples), lab (`x = 2` INPUT at L.pt(2.7 + 2.1i); `u = 4 − v²/16` OUTPUT at R.pt(0) + (1.55, 2.1)), mid (link), cur, focus (a ring of 0.1 at R.pt(0) and `Text("focus 0", 22)` 0.38 below), foot (`w = z²`, `clock_bar`).
2. `play(clock → 1, 0.38 t, linear)` (0.3 to 8.8 s; spoken "Push the line x equals 2 forward, with y as the clock, and it bends into a parabola" 1.2 to 10.4 s).
3. The polar act. `θ = ValueTracker(20°)`, `r_in = 2.5`, `r_out = 6.25`: ray `L.pt(0) → L.pt(r_in e^{iθ})`, ray `R.pt(0) → R.pt(r_out e^{2iθ})` (POLAR, width 5), arcs of radius 0.9 from angle 0 to θ and to 2θ at the origins, an arc of the circle of radius `r_in·L.scale` (from −0.2 rad, angle 1.9), the full circle of radius `r_out·R.scale`, dots on the two ray ends, labels `r = 2.5` at L.pt(1.6 − 2i) and `r² = 6.25` at R.pt(−7.9i), and the readouts `Text(f"θ = Arg z = {θ°}°")` at the left foot and `Text(f"2θ = Arg w = {2θ°}°")` at the right foot (size 28, POLAR). `freeze(cur)`; `put(0.06 t, cur = None, mid = None, lab = None, foot = readouts, polar = overlay)`; `play(data_l.opacity → 0.2, data_r.opacity → 0.2, 0.04 t)`.
4. `play(θ → 42°, 0.3 t, smooth)` (about 11.0 to 17.7 s; spoken "In polar, z squared squares the length and doubles the angle ..." 10.8 to 18.4 s). The image ray is at 2θ, 40° to 84°, and r goes from 2.5 to 6.25: the same map on a ray.
5. `play(data_l.opacity → 1, data_r.opacity → 1, 0.06 t)` (spoken "In Cartesian, a straight line is not so lucky" 18.4 s): the parabola comes back under the ray.

**recip** (t = 24.35 s). `θ(s) = −π/2 + πs`, `zin(s) = 2 cos θ · e^{iθ}`, `zout(s) = 1/zin(s)` (so Re w = ½); `L = Plane(LEFT_C, focus 1, scale 1.3)`, `R = Plane(RIGHT_C, focus 0.5, scale 1.3)` (the v-axis is 0.65 units, 58 px at 720p, left of the line); clock starts at 0.05.
1. `cursors` (the image cursor with `clamp = 2.4`). `cut`: head ("1/z: a circle opens into a line" | "zero goes to infinity"), left, right, data_l (`ramped(L, zin(s), INPUT)` for 301 samples of s from 0.004 to 0.996; `clock_dots` at s = 0.1, 0.25, 0.5, 0.75, 0.9; a ring at L.pt(0) with `Text("0")`), data_r (`ramped(R, zout, OUTPUT)`; dots at the same s; up and down arrows (OUTPUT, width 5) from R.pt(0.5 ± 1.40i) to R.pt(0.5 ± 1.65i), their tips 0.25 below the parked cursor with `Text("to infinity", 22)` beside each), lab (`|z − 1| = 1` INPUT at L.pt(2.45 + 1.7i); `Re w = ½` OUTPUT at R.pt(1.95)), mid (link), cur, foot (the readout and `clock_bar`).
2. The readout is rebuilt every frame by `always_redraw` from `z = zin(clock)`: `Text(f"r = |z| = {|z|:.2f}   →   1/r = {1/|z|:.2f}", 24, POLAR)` over `Text(f"θ = Arg z = {Arg z:.0f}°   →   −θ = {−Arg z:.0f}°", 24, POLAR)` (U+2212 for the minus signs), the two lines left-aligned with each other and the pair centred at (−3.95, −3.45).
3. `play(clock → 0.95, 0.8 t, linear)` (0.3 to 19.8 s): z leaves 0 below the real axis, goes round the circle counter-clockwise and comes back to 0 from above, while w runs from +∞ down the line to −∞. Spoken: "inverts the length and flips the angle" (0 to 4 s: the readout shows a small r and a large 1/r), "Zero goes to infinity, so the circle opens into a line" (19.6 s: the image is leaving at the bottom edge).

**paper** (t = 22.75 s). `zin(s) = 2 + i(−PAPER_Y + 2·PAPER_Y·s)`, `PAPER_Y = 1.4`, `zout = zin²`; planes of box 6.2 × 3.6 centred at (∓3.75, 0.9); `L` focus 0.8 scale 1, `R` focus 0 scale 0.25.
1. Titles at y = 2.88 (size 32). Three cards of 4.35 × 2.3 centred at (−4.7, −2.5), (0, −2.5), (4.7, −2.5): SURFACE fill 0.8, MUTED frame 2, heading `Text("1  Parametrize" | "2  Push forward" | "3  Eliminate y", 26, INK)`, then the MathTex lines of 2.5 (CART except the MUTED `z(t) = a + t(b − a)`). `ring(i) = SurroundingRectangle(cards[i], POLAR, buff 0.04, width 4)`.
2. `cut`: head ("On paper: three steps" | "parametrize, push forward, eliminate"), left (axes, title), right (axes, title), data_l (stroke and dots), data_r (stroke, dots, a focus ring at R.pt(0)), cur, cards, ring (card 1).
3. `wait(0.27 t)` (6.1 s); `put(0.06 t, ring = card 2)` (spoken "Push forward: u equals 4 minus y squared, and v equals 4y" 7.2 to 12.0 s); `play(clock → 1, 0.15 t, linear)`; `put(0.06 t, ring = card 3)` (spoken "Eliminate y" 12.0 s); `wait(0.25 t)`; `put(0.06 t, ring = all three)` (spoken "Every image question goes parametrize, push forward, eliminate" 19.2 s).

### 5.5 zoom-cr, beat by beat

Constants: `Z0 = ½ + ½i`, `ZOOM = 20`, `RING_R = 1`, `RHO = 0.05`, `LIMIT_RHO = 1e-3`, `N_DIR = 24`, `φ_k = 2πk/24`.

**The two microscope panels** (`micro_left`, `micro_right`; used by ring, move and quotient).
1. Left: `L = Plane(LEFT_C, focus Z0, scale ZOOM)`; faint CART grid lines (width 1.2, opacity 0.25) at `Re z = Re Z0 + j/ZOOM`, `j = −3..3`, and `Im z = Im Z0 + j/ZOOM`, `j = −2..2`, cut to the box; the ring circle (MUTED, radius `RING_R` = 1.0 screen, opacity 0.5); 24 arrows `Arrow(L.pt(Z0), L.pt(Z0 + RHO e^{iφ_k}))`, colour `ramp_dir(INPUT, φ_k)`, width 3.5, tip 0.16; the point (INK dot 0.09), a thin leader line to the label `z₀` at (−1.7, −1.25) from the centre, the title `z = z₀ + Δz`, and `Text("zoom ×20", 22, MUTED)` at the lower right.
2. Right: `R = Plane(RIGHT_C, focus f(Z0), scale ZOOM)`; the faint image grid (`grid_image(R, f, Z0, ZOOM, samples 81, faint)`), the closed image curve through 121 samples of `f(Z0 + RHO e^{iq})` (OUTPUT, width 1.5, opacity 0.5), 24 image arrows `Arrow(R.pt(f(Z0)), R.pt(f(Z0 + RHO e^{iφ_k})))` coloured `ramp_dir(OUTPUT, φ_k)`, the point, a leader and the label `f(z₀)` at (−2.35, −2.0), the title `w = f(z₀ + Δz)`.

**intro** (t = 15.55 s).
1. `k = ValueTracker(0)` (log₁₀ of the zoom). Left `= always_redraw(grid_image(Plane(LEFT_C, Z0, 10^k), identity, Z0, 10^k))`; right `= always_redraw(grid_image(Plane(RIGHT_C, f(Z0), 10^k), f_zz, Z0, 10^k))`; both with the dot (INK 0.1) and label at the centre; the readout `Text(f"zoom ×{10^k:.0f}", 30)` at (0, −3.45); the foot `f(z) = z² + z` at the left. `place` (frame 0 is this picture, the grids at ×1): head ("Zoom in" | "up close, the bending goes away"), left, right, foot.
2. `play(k → log₁₀ 20, 0.6 t, smooth)`: at every frame the grid has lines every `1/10^k` units, so the left picture is the same square lattice (one screen unit per cell) and the right shows the image of that lattice, curved at ×1 and straight at ×20 (cells of |f′| = 2.236 screen units, turned by 26.565°). 0.3 to 9.6 s; spoken "Up close, the bending disappears, and the grid comes out straight, only turned and stretched" 5.2 to 11.2 s.
3. `put(0.1 t, rx = Text("turned and stretched", 28, POLAR) at the right foot)`.

**grid_image(plane, f, z0, zoom, n = 3)**: `d = 1/zoom`; `s = linspace(−3.6 d, 3.6 d, 161)`; for `j = −n..n` and for the two families `z = (Re z0 + j d) + i(Im z0 + s)` and `z = (Re z0 + s) + i(Im z0 + j d)`: `P = plane.pts(f(z))` and `runs(P, plane)` split it into the pieces inside the box (a point is dropped when it or a neighbour is outside or not finite); each piece is a `polyline(piece, CART, width, opacity)` with `width = 4, opacity` 0.8 for `j = 0` and 2.2, 0.56 otherwise (`faint`: 1.2 and 0.24).

**ring** (t = 19.15 s).
1. `φ = ValueTracker(0)`; the highlight `Arrow(L.pt(Z0), L.pt(Z0 + RHO e^{iφ}))` (INK, width 8, tip 0.22), its image `Arrow(R.pt(f(Z0)), R.pt(f(Z0 + RHO e^{iφ})))`, and an `Arc(0.55, from 0 to φ)` (POLAR, width 4) at z₀, all `always_redraw`; foot `Δz = ρe^{iφ}   φ ∈ arg Δz` (ρe^{iφ} POLAR, the set note MUTED).
2. `put`: head ("A ring of directions" | "where does f send each step?"), left (`micro_left`), right (`micro_right`), lx (highlight, arc), rx (image highlight), foot. Then `play(φ → 2π, 0.6 t, linear)` (0.3 to 11.8 s; spoken "Each arrow is a step ... angle phi" 4.4 to 9.6 s).

**move** (t = 22.35 s). The panels stay.
1. `W0 = f(Z0) = 0.5 + i`, `f′ = 2Z0 + 1 = 2 + i`. `put`: head ("One move up close" | "multiply by f prime of z zero"); lx = the φ = 0 arrow (INK, 8) with the label `ρ`; rx = the image of that arrow, a dashed POLAR baseline (length 2.4 along the real direction), the turn arc `Arc(1.0, 0 → Arg f′)` (POLAR, 5), the label `Arg f′ = 26.6°` (size 28) in the top-right corner of the box at (2.1, 2.25) from W0, outside the ring of image arrows (the fix round of 0.4: at (1.5, −0.4) it was drawn over the arrows), and `|f′|ρ = √5 ρ` in the top-left corner at (−1.95, 2.25); foot and foot2 cleared.
2. `wait(0.1 t)`; `Indicate(turn, POLAR, 1.05)` over `0.1 t` (a single pulse); `wait(0.43 t)`; `put(0.05 t, foot = Cartesian column)`: `Text("Cartesian", 26, CART)` over `f′(z₀) = u_x + i v_x = 2 + i` (34, CART) at (−3.75, −3.42); `wait(0.15 t)`; `put(0.05 t, foot2 = polar column)`: `Text("polar", 26, POLAR)` over `f′(z₀) = √5 e^{i 26.6°}` at (3.75, −3.42). The columns arrive at about 15 s and 19 s: spoken "In Cartesian, u sub x plus i v sub x" 15.2 s, "In polar, a stretch and a turn" 19.2 s.

**quotient** (t = 21.55 s). The left panel stays. `A, B = AB(f_abs2, Z0) = (0.5 − 0.5i, 0.5 + 0.5i)`, `|B| = 0.7071`.
1. `Q = Plane(RIGHT_C, focus 0.5 − 0.5i, scale 2.6)` (the origin is on the circle). 24 dots `Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, φ_k)), 0.085, ramp_dir(OUTPUT, φ_k, 0.6), BG outline)` (12 distinct positions); the circle `DashedVMobject(Circle(|B|·2.6, POLAR, 3).move_to(Q.pt(A)), 48 dashes)`; the centre `Dot(Q.pt(A), 0.07, POLAR)` with the label `A` 0.34 below; the radius `Line(Q.pt(A), Q.pt(A + |B|), WARN, 4)` with the label `|B|` 0.3 above its middle; the title `Δw / Δz`.
2. The highlight pair `always_redraw(Arrow(L.pt(Z0), L.pt(Z0 ± RHO e^{iφ})))` (both INK, 8) and the rider `Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, φ)), 0.15, INK)`; foot `Δw/Δz → A + Be^{−2iφ}` (A, e^{−2iφ} POLAR; B WARN) at the right and `Text("opposite arrows, same dot", 24, MUTED)` at the left; foot2 cleared. `put` head ("One dot per direction" | "the dots trace a circle"), right (axes of Q, title), lx, rx, foot.
3. `play(φ → 2π, 0.6 t, linear)` (0.3 to 14.7 s): the pair turns once, the rider goes round the circle **twice**, clockwise (angle −2φ). Spoken: the formula sentence "The quotient tends to A plus B times e to the minus 2 i phi" 6.0 to 12.0 s (the foot shows `Δw/Δz → A + Be^{−2iφ}` from 0.3 s), then "one dot per direction, tracing a circle" 12.0 to 14.8 s, as the rider finishes its second lap.

**mirror** (t = 21.55 s). `A0 = 2 Z0 + 1 = 2 + i`. `QL = Plane(LEFT_C, focus 0.25, scale 2.0)`, `QR = Plane(RIGHT_C, focus A0, scale 2.0)`; `ρ = ValueTracker(0.10)`.
1. Left, conj z: 24 dots at `quotient(f_conj, Z0, 0.1, φ_k)` (exactly `e^{−2iφ}` for every ρ), the dashed circle of radius `|B|·scale` (2.0) at `QL.pt(A)`, the radius `Line(QL.pt(A), QL.pt(A + |B|), WARN)` with `|B| = ` and `tex_half(|B|)` (`1`), with `A, B = AB(f_conj, Z0)` (never typed), `Text("never shrinks", 26, WARN)` at the left foot, the title `z̄: A = 0, B = 1` (the title belongs to this slot group so the swap changes it).
2. Right, z² + z: `always_redraw` 24 dots at `quotient(f_zz, Z0, ρ, φ_k)` (= `A0 + ρ e^{iφ_k}`), `always_redraw` circle of radius `max(2ρ, 0.02)` at `QR.pt(A0)` (POLAR, 2.5), the green point `Dot(QR.pt(A0), 0.06, OK)` with `f′ = 2z + 1` 0.62 above; title `z² + z: A = 2z + 1, B = 0`; foot `Text(f"ρ = {ρ:.2f}", 30, INK)` at the right foot.
3. `put`: head ("B is the mirror part" | "no mirror, no circle"), left (axes of QL), right (axes of QR, title), lx (conj panel), rx (right panel), foot, foot2 cleared. `play(ρ → 0.06, 0.4 t, linear)` (0.3 to 8.9 s; spoken "Conjugation is pure mirror ... never shrinks" 2.0 to 8.4 s).
4. `put(0.1 t, lx = Re z panel)`: dots at `quotient(f_re, Z0, 0.1, φ_k)` (exactly `½ + ½ e^{−2iφ}`), the dashed circle of radius `|B|·scale` (1.0) at `QL.pt(A)`, `|B| = ` + `tex_half(|B|)` (`\tfrac12`) at `QL.pt(A + (|B| + 0.24)i)`, with `A, B = AB(f_re, Z0)`, `Text("Re z: never shrinks either", 26, WARN)`, the title `Re z: A = ½, B = ½` (spoken "The real part squashes the plane" 8.4 s). 5. `play(ρ → 0.02, 0.4 t, linear)` (spoken "But z squared plus z has no mirror. Its circle shrinks to a single point, the derivative, 2z plus 1" 13.2 to 21.2 s).

**cr** (t = 23.55 s).
1. Left: `eqs = VGroup(MathTex("u_x = v_y", 60, CART), MathTex("u_y = -v_x", 60, CART)).arrange(DOWN, 0.4)`, `Text("no mirror part", 30, OK)`, `MathTex` of the two matrices (`u_x u_y; v_x v_y` = `a −b; b a`, 44, CART); stacked with gaps of 0.45 and centred at (−3.75, −0.15).
2. Right: `P = Plane(RIGHT_C, focus 0.4 + 1.4i, scale 1.15)`; `s = ValueTracker(0)`; the unit square `sq = [0, 1, 1 + i, i]` drawn as four INPUT lines (width 4); the image `always_redraw(Polygon(P.pt((1 − s) z + s J(z)) for z in sq), OUTPUT, 5, fill 0.18)` with `J(z) = (2x − y) + i(x + 2y)` (the Jacobian [[2, −1], [1, 2]]); the arc `Arc(0.8, 0 → s·Arg(2 + i))` at the origin (POLAR); the label `a = 2, b = 1` (CART) at P.pt(2 − 0.35i); the title `a tiny square`.
3. `put`: head ("Cauchy-Riemann" | "no mirror: one turn, one stretch"), left, lx = None, right (axes, title), rx (squares, arc, label), foot and foot2 cleared. `wait(0.4 t)`; `play(s → 1, 0.35 t, smooth)` (about 9.7 to 17.9 s; spoken "It says the four partials make the matrix a, minus b, b, a: a turn and a stretch" 10.4 to 18.4 s); `put(0.05 t, foot = Cartesian column)` (spoken "Then the derivative is u sub x plus i v sub x" 18.4 s); `wait(0.05 t)`; `put(0.05 t, foot2 = polar column)`.

**abs2** (t = 19.55 s). `z_start = 1.2 + 0.9i` (|z_start| = 1.5), `u = ValueTracker(0)`, `z₀(u) = z_start (1 − u)`.
1. `L = Plane(LEFT_C, focus z_start/2, scale 1.7)`; a dashed MUTED path from `z_start` to 0; a ring and `Text("0", 24)` at 0; the point `Dot(L.pt(z₀), 0.11, INK)` with the label `z₀` 0.35 right and 0.28 up, both following by updaters (the label is one `MathTex` built once). `Q = Plane(RIGHT_C, focus conj(z_start)/2, scale 1.25)`.
2. Right: `always_redraw` circle `DashedVMobject(Circle(max(|z₀|·1.25, 0.03), POLAR, 3).move_to(Q.pt(conj z₀)), 48)`; `always_redraw` 24 dots at `quotient(f_abs2, z₀, LIMIT_RHO, φ_k)`; the centre dot with the label `A = z̄₀` following `Q.pt(conj z₀)` by updaters, the label `max(0.42, |z₀|·1.25 + 0.32)` **above** the centre, i.e. above the circle, never on its dots (the fix round of 0.4: it was 0.42 below and crossed the dots once the circle was small); foot `live_number(r"|B| = |z_0| =", abs(z₀), (3.75, −3.45), 2 decimals, WARN)` and `f(z) = |z|²` at the left foot. `put`: head ("Absolute value squared" | "the circle shrinks to 0"), left (axes, title `z`, path, ring), right (axes, title `Δw/Δz`), lx (z₀), rx (circle, dots, centre), foot, foot2 cleared.
3. `play(u → 1, 0.65 t, linear)` (0.3 to 13.0 s): `|z₀|` goes 1.5 to 0 linearly; at +0.5 s the readout is 1.48 and at +3.5 s 1.12 (7.4). Spoken "It shrinks to a point only when z zero reaches 0" 9.2 to 13.6 s.
4. `put(0.1 t, rx = VGroup(Dot(Q.pt(0), 0.08, OK), MathTex("f'(0) = 0", 36, OK) 0.6 above))` replaces the frozen circle with the end state.

### 5.6 Resolution, performance, determinism

1. **One layout for every quality.** All positions and sizes are scene units; manim scales stroke widths and fonts with the frame, so the 480p15 check render and the 720p30 deliverable are the same picture (`-ql` is 854 × 480 at 15 fps, `-qm` 1280 × 720 at 30 fps). The fastest on-screen motion is about 2.5 units per second (the rider in `quotient`), 0.17 units per frame at 15 fps and half that at 30.
2. **Per-frame cost.** At most about 60 mobjects are rebuilt per frame (the two grids of the `intro` zoom: about 30 polylines each; the 24 dots of `mirror`, `quotient` and `abs2`; one or two `Text` readouts). `Text` costs about 15 ms to build; `MathTex` is never built in a frame loop (D13).
3. **LaTeX once.** Every `MathTex` string is a literal or built once per beat; manim caches the compiled SVGs in `<media_dir>/Tex` by content hash, so only a first render pays (the prototype compiled about 60 strings per film). `latex` and `dvisvgm` must be on the PATH.
4. **Measured cost** (a machine shared with other renders, load average 25 to 30, so wall time is noisy; CPU time is steady): 480p15 render of `motion-time` 1 min 59 s CPU, `zoom-cr` 1 min 03 s CPU (2 to 8 minutes of wall time); 720p30 `motion-time` 4 min 26 s CPU (with a cold `Tex` cache) and `zoom-cr` 2 min 37 s; peak resident memory about 550 MB at 720p.
5. **Hit testing and input.** There is none: a film takes no pointer, touch or keyboard input; the hit targets are the player's own (the browser's). The only "picking" in the scenes is geometric clipping (`Plane.inside`, `runs`), which keeps every curve inside its frame.
6. **Determinism.** No random numbers: every position is a function of the constants; two renders of the same sources give the same frames. `--disable_caching` (set by `render.mjs`) avoids stale partial movies; the output file names are fixed.

---

## 6. Mathematics

Every number on screen is one of those below. Each was worked by hand, then recomputed with `js/core/complex.js` (the tests of 7.2, group U5) and, for the scene's own constants, with Python (`check_numbers()`).
`z = x + iy = r e^{iθ}` is the one point; `(x, y)` is its Cartesian address and `(r, θ)` its polar address, with `θ` any name in `arg z` and `Arg z` the home name in `(−π, π]`.

### 6.1 Formulas used

1. **Addresses.** `r = |z| = √(x² + y²)`, `Arg z = atan2(y, x)`, `x = r cos θ`, `y = r sin θ`. `1/z = conj z / |z|² = e^{−iθ} / r`: length inverted, angle flipped.
2. **Linear maps.** `w = az + b` turns by `Arg a`, stretches by `|a|`, slides by `b`; `i = e^{iπ/2}` is a quarter turn. A map `w = a(z − p) + p` is a rotation about `p` (for `a = i`, `p` solves `ip − 2i = p`).
3. **Squaring.** `z² = (x² − y²) + 2xy·i`; polar: `(r, θ) ↦ (r², 2θ)` (every name of the angle doubled).
4. **A line under z².** For `x = c ≠ 0`: `z = c + iy`, `w = (c² − y²) + 2cy·i`, so `u = c² − y²`, `v = 2cy`, and eliminating y: `u = c² − v²/(4c²)`, a parabola opening left with vertex `c²` and focus `0`. In polar the line is `r cos θ = c`, the image is `ρ = r² = c²/cos²θ` at `φ = 2θ`, i.e. `ρ = 2c²/(1 + cos φ)`: a parabola with its focus at the pole and its directrix the line `u = 2c²`.
5. **Reciprocal of the circle |z − 1| = 1.** `x² + y² = 2x`; `w = conj z / |z|²` gives `u = x/(x² + y²) = ½`, `v = −y/(2x)` (z ≠ 0). In polar the circle is `r = 2 cos θ`, `θ ∈ (−π/2, π/2)` (0 is the one point where `θ` is not defined), so `w = e^{−iθ}/(2 cos θ) = ½ − (i/2) tan θ`.
6. **A segment.** `z(t) = a + t(b − a)`, `0 ≤ t ≤ 1`.
7. **The local linear form.** `f(z₀ + h) − f(z₀) = f_x Δx + f_y Δy + o(|h|)`; with `Δx = (h + h̄)/2` and `Δy = (h − h̄)/(2i)` this is `A h + B h̄ + o(|h|)`, **`A = ½(f_x − i f_y)`**, **`B = ½(f_x + i f_y)`** (the move part and the mirror part; `h̄ = conj h`).
8. **The direction circle.** For `h = ρ e^{iφ}`: `(f(z₀ + h) − f(z₀))/h → A + B h̄/h = A + B e^{−2iφ}`. As `φ` goes once round, `e^{−2iφ}` goes **twice** round, clockwise: a circle of centre `A` and radius `|B|`; `φ` and `φ + π` give the same point.
9. **Cauchy–Riemann is B = 0.** With `f_x = u_x + i v_x`, `f_y = u_y + i v_y`: `f_x + i f_y = (u_x − v_y) + i(v_x + u_y)`, which is `0` exactly when **`u_x = v_y` and `u_y = −v_x`**. Then `f_y = i f_x`, `A = ½(f_x − i·i f_x) = f_x`, so **`f′(z₀) = A = u_x + i v_x = v_y − i u_y`**, and the Jacobian is `[[u_x, u_y], [v_x, v_y]] = [[a, −b], [b, a]]` with `a = u_x`, `b = v_x`: multiplication by `f′ = a + ib` (turn `Arg f′`, stretch `|f′|`).
10. **The three examples and Re z.** `conj z`: `f_x = 1`, `f_y = −i`, `A = 0`, `B = 1`. `Re z`: `A = B = ½`. `z² + z`: `f_x = 2z + 1`, `f_y = i(2z + 1)`, `A = 2z + 1`, `B = 0`. `|z|²`: `f_x = 2x`, `f_y = 2y`, `A = x − iy = conj z`, `B = x + iy = z`. Exact quotients: `conj`: `h̄/h = e^{−2iφ}` for every ρ; `Re`: `Re h/h = cos φ e^{−iφ} = ½ + ½ e^{−2iφ}`; `z² + z`: `2z + 1 + h`; `|z|²`: `conj z + z e^{−2iφ} + h̄`.
11. **Determinant.** The linear map `h ↦ Ah + B h̄` has determinant `|A|² − |B|²`: a move when `B = 0`, a mirror when `|B| > |A|`.

### 6.2 The review problems, in both addresses

**1.5.1 Parametrize the line from 2 + i to −3 − 3i.**
*Cartesian (slide):* the slide is `(−3 − 3i) − (2 + i) = −5 − 4i`, so `z(t) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t)`, `0 ≤ t ≤ 1`. Checks: `z(0) = 2 + i`, `z(¼) = ¾`, `z(½) = −½ − i`, `z(¾) = −1.75 − 2i`, `z(1) = −3 − 3i`.
*Polar (move):* the start is `√5 e^{i·26.565°}` (|2 + i| = 2.2360680, Arg = 0.4636476 rad), and the slide is `−5 − 4i = √41 e^{i·(−141.340°)}` (|·| = 6.4031242, Arg = atan2(−4, −5) = −2.4668517 rad): "start, then walk `t√41` in the direction −141.34°". The slide is easy in Cartesian, the walk reads in polar; the clock `t` is the walked fraction.

**2.1.3 Image of x = 2 under f(z) = iz − 2i; what does the map do?**
*Cartesian:* `z = 2 + iy`, `iz − 2i = i(2 + iy) − 2i = −y`. The image is the real axis, `u = −y`, `v = 0` (traversed right to left as y grows). In coordinates the map is `u = −y`, `v = x − 2`: the matrix `[[0, −1], [1, 0]]` and the slide `(0, −2)`.
*Polar:* `i = e^{iπ/2}`: stretch 1, turn 90° counter-clockwise, then slide by `−2i`. The line `x = 2` turned about 0 is `v = 2` (`iz = −y + 2i`), slid down 2 it is `v = 0`. In general: a rotation by 90° about the fixed point `1 − i` (`i(1 − i) − 2i = 1 − i`; `w − (1 − i) = i(z − (1 − i))`). Checks: `f(2) = 0`, `f(2 + i) = −1`, `f(2 − 2i) = 2`, `f(1 − i) = 1 − i`.

**2.1.2 Image of x = 2 under w = z².**
*Cartesian:* `z = 2 + iy`, `w = (4 − y²) + 4y·i`, so `u = 4 − y²`, `v = 4y`; eliminate `y = v/4`: **`u = 4 − v²/16`**, vertex 4, opening left, focus 0 (`v² = −16(u − 4)`, `p = 4`, focus `4 − 4 = 0`), directrix `u = 8`. Checks: `y = 1`: `3 + 4i`; `y = 2`: `8i`; `y = 3`: `−5 + 12i`; `y = −1`: `3 − 4i`; each satisfies `u = 4 − v²/16` and `|w| = 8 − u` (distance to the focus equals distance to the directrix: 5, 8, 13, 5).
*Polar:* the line is `r cos θ = 2` (`θ = Arg z ∈ (−π/2, π/2)`, `r = 2/cos θ`); squaring gives `ρ = r² = 4/cos²θ` at `φ = 2θ` (home name since |φ| < π), and `cos²θ = (1 + cos φ)/2`, so **`ρ = 8/(1 + cos φ)`**, the polar equation of a parabola with its focus at the pole. Checks: `y = 1`: `θ = 26.565°`, `φ = 53.130°`, `cos φ = 0.6`, `ρ = 8/1.6 = 5` ✓; `y = 2`: `φ = 90°`, `ρ = 8` ✓; `y = 3`: `θ = 56.310°`, `φ = 112.620°`, `cos φ = −5/13`, `ρ = 13` ✓; `y = 0`: `φ = 0`, `ρ = 4` ✓.

**2.5.1 Image of |z − 1| = 1 under w = 1/z.**
*Cartesian:* `x² − 2x + y² = 0`, so `x² + y² = 2x`; `w = (x − iy)/(x² + y²)`, `u = x/(2x) = ½`, `v = −y/(2x)`; as `z` runs over the circle minus 0, `y/x` takes every real value, so `v` takes every real value: **the line `Re w = ½`** (z = 0 goes to ∞ and is left out).
*Polar:* `z = 2 cos θ e^{iθ}` (θ = Arg z), `w = 1/z = e^{−iθ}/(2 cos θ) = (cos θ − i sin θ)/(2 cos θ) = ½ − (i/2) tan θ`: real part ½ for every θ, `|w| = 1/(2 cos θ) → ∞` as `θ → ±π/2`, and `Arg w = −θ`. The circle through 0 must open into a line because 0 goes to ∞. Checks: `θ = 0`: `z = 2`, `w = ½`; `θ = 45°`: `z = 1 + i`, `w = ½ − ½i`; `θ = −45°`: `z = 1 − i`, `w = ½ + ½i`; `θ = 60°`: `z = ½ + (√3/2)i`, `w = ½ − (√3/2)i`, and every one has `|z − 1| = 1` to 1e-9.

**3.1.1 f(z) = z² + z is differentiable everywhere; find f′.**
*Cartesian:* `(f(z + h) − f(z))/h = (2zh + h² + h)/h = 2z + 1 + h → 2z + 1` in every direction, so `f′(z) = 2z + 1`. In coordinates `u = x² − y² + x`, `v = 2xy + y`: `u_x = 2x + 1`, `u_y = −2y`, `v_x = 2y`, `v_y = 2x + 1`; CR holds everywhere.
*Polar:* with `h = ρ e^{iφ}` the quotient is `2z + 1 + ρ e^{iφ}`: a circle of radius ρ around `A = 2z + 1`, which shrinks to the point `A` as ρ → 0 (B = 0). The local move turns by `Arg(2z + 1)` and stretches by `|2z + 1|`. At `z₀ = ½ + ½i` (polar address `√2/2 · e^{i·45°}`): `f(z₀) = ½ + i`, `f′(z₀) = 2 + i = √5 e^{i·26.565°}` (|·| = 2.2360680, Arg = 0.4636476 rad = 26.5650512°), Jacobian `[[2, −1], [1, 2]]` (`u_x = 2`, `u_y = −1`, `v_x = 1`, `v_y = 2`).

**3.1.2 f(z) = |z|² is differentiable only at 0.**
*Cartesian:* `u = x² + y²`, `v = 0`; `u_x = 2x`, `v_y = 0`, `u_y = 2y`, `−v_x = 0`: CR holds only where `x = 0` and `y = 0`; the partials are continuous, so `f` is differentiable at 0, with `f′(0) = u_x + i v_x = 0`, and nowhere else; no disk around 0 has f differentiable, so f is analytic nowhere.
*Polar:* `(|z + h|² − |z|²)/h = conj z + z h̄/h + h̄ → conj z + z e^{−2iφ}`: a circle of centre `conj z` and radius `|z|`, a single point only when `|z| = 0`. The circle always passes through 0 (the centre is `|z|` from the origin and the radius is `|z|`). Numbers: `z₀ = 1.2 + 0.9i`: centre `1.2 − 0.9i`, radius 1.5, extreme quotients 2.4 (φ = 0), `−1.8i` (φ = 90°); `z₀ = ½ + ½i`: centre `½ − ½i`, radius 0.7071, quotients `1` (φ = 0), `−i` (φ = 90°), `1 − i` (φ = 45°).

**P6 Re z is not differentiable.**
*Cartesian:* `u = x`, `v = 0`: `u_x = 1 ≠ 0 = v_y` at every point, so CR fails everywhere.
*Polar:* `Re h/h = cos φ e^{−iφ} = ½ + ½ e^{−2iφ}`: the circle of centre ½ and radius ½ through 0 and 1: the quotient is 1 along the real axis (φ = 0) and 0 along the imaginary axis (φ = 90°), so there is no limit at any point (A = B = ½, B ≠ 0). The same circle at every z₀, at every ρ.

**3.2.1 f(z) = e^x(cos y + i sin y) is entire; find f′.**
*Cartesian:* `u = e^x cos y`, `v = e^x sin y`; `u_x = e^x cos y = v_y`, `u_y = −e^x sin y = −v_x`; the four partials are continuous on ℝ², so by the theorem f is differentiable everywhere (entire), and `f′ = u_x + i v_x = e^x cos y + i e^x sin y = f(z)`.
*Polar:* `f = e^x · e^{iy}`: stretch `e^x`, turn `y` (the home name for |y| ≤ π); `f′ = f` has the same stretch and turn, and the Jacobian is `e^x [[cos y, −sin y], [sin y, cos y]]`: `a = e^x cos y`, `b = e^x sin y` in `[[a, −b], [b, a]]`. Numbers at `z₀ = ln 2 + iπ/3`: `e^x = 2`, `f = 2(cos 60° + i sin 60°) = 1 + √3 i` (1.7320508), `f′ = 1 + √3 i`, `u_x = v_y = 1`, `u_y = −v_x = −√3`, `|f′| = 2`, `Arg f′ = π/3`. (Not on screen in `zoom-cr`; asserted in U5.)

### 6.3 The numbers the films state (and the test that pins each)

| Statement on screen or in the narration | Value | Pinned by |
|---|---|---|
| x = 2 under z²: u, v at y = 1, 2, 3, −1 | 3 + 4i, 8i, −5 + 12i, 3 − 4i | U5 2.1.2, `check_numbers()` |
| the parabola | u = 4 − v²/16, vertex 4, focus 0, directrix u = 8, ρ = 8/(1 + cos φ) | U5 2.1.2 |
| r = 2.5 under z² | r² = 6.25, θ = 20…42° gives 2θ = 40…84° | `check_numbers()` (30° case), the film |
| iz − 2i on x = 2 | the real axis, w = −y; fixed point 1 − i | U5 2.1.3, `check_numbers()` |
| \|z − 1\| = 1 under 1/z | Re w = ½, w = ½ − (i/2) tan θ, Arg w = −θ, \|w\| = 1/(2 cos θ) | U5 2.5.1, `check_numbers()` |
| the line 2 + i → −3 − 3i | z(t) = (2 − 5t) + i(1 − 4t); slide −5 − 4i, √41 = 6.4031242, Arg −141.340° | U5 1.5.1 |
| z² + z at z₀ = ½ + ½i | f(z₀) = ½ + i, f′ = 2 + i, √5 = 2.2360680, 26.5650512°, J = [[2, −1], [1, 2]], quotient = 2z + 1 + h | U5 3.1.1, `check_numbers()` |
| \|z\|² | A = conj z₀, B = z₀, radius \|z₀\| (0.7071 at ½ + ½i; 1.5 at 1.2 + 0.9i), circle through 0, f′(0) = 0 | U5 3.1.2, `check_numbers()` |
| conj z, Re z | (A, B) = (0, 1), (½, ½); radii 1 and ½; exact for every ρ | U5 conj and Re |
| e^z at ln 2 + iπ/3 | J = [[1, −√3], [√3, 1]], f′ = f = 1 + √3 i = 2e^{iπ/3} | U5 3.2.1 |
| film lengths | 132.50 s (326 words) and 145.65 s (358 words) | U1b |
| the abs2 readout | `\|B\| = \|z₀\|` = 1.48 at +0.5 s and 1.12 at +3.5 s (radius 1.5·(1 − (τ − 0.3)/12.7)) | 7.4 |

---

## 7. Verification plan

Run everything from the repo root. `manim` is `~/.venvs/manim/bin/manim` (v0.22.0); `render.mjs` finds it. The numbers quoted as "expected" were measured on the prototype of 7.6.

| Criterion | Method | Where |
|---|---|---|
| A1 renders, captions equal the narration, manifest, sizes | `smoke` (commands) + the browser half in the interaction script | 7.1, 7.3 |
| A2 beats and narration consistent, phrases, palette | `unit_test` | 7.2 (`tests/unit/i2-videos-ch2.test.mjs`, 20 tests) |
| A3 stills show the clock, the bending line, the ring, the shrinking circle | `screenshot_review` | 7.4 |
| A4 the numbers are the story's | `code_inspection`, backed by `check_numbers()` at run time and test group U4/U5 | 7.5 |

### 7.1 A1: render, captions, manifest, size

```
node tools/videos/render.mjs --only motion-time,zoom-cr --quality l          # the check render, 480p15, exit 0
ls -l media/video/motion-time.mp4 media/video/motion-time.vtt media/video/zoom-cr.mp4 media/video/zoom-cr.vtt
for f in motion-time zoom-cr; do ffprobe -v error -show_entries format=duration -of csv=p=0 media/video/$f.mp4; done
node --test tests/unit/i2-videos-ch2.test.mjs                                 # group U6 compares each .vtt to its JSON, cue by cue
grep -n '"id": "motion-time"\|"id": "zoom-cr"\|"station"' media/manifest.js   # both ids; station mappings and derivative; captions paths
node tools/videos/render.mjs --only motion-time,zoom-cr --quality m          # once, at the end: the deliverable, 720p30
stat -c '%s %n' media/video/motion-time.mp4 media/video/zoom-cr.mp4
```

Passing: `render.mjs` prints `✓ media/video/motion-time.mp4 (132.4s)` and `✓ media/video/zoom-cr.mp4 (143.1s)` and `Wrote media/manifest.js (N video(s), ...)` (N counts every film rendered so far, including the other
video goals'); `ffprobe` prints **132.40** and **145.5** (accept 131 to 134 and 144 to 147; the hard limits are 120 and 180; the prototype measured 143.13 before the fix round); each `.vtt` has exactly **6** and **7** cues (`WEBVTT`, then numbered cues whose first starts at `00:00:00.000`),
each cue's text identical to the JSON segment and each cue starting where the previous one ended (U6); `media/manifest.js` has both entries with `station` `mappings` and `derivative`, `src` `media/video/<id>.mp4`,
`captions` `media/video/<id>.vtt`, `seconds` 132 and 146, `narrated: false`, `music: false`. Sizes: the 720p30 files are expected to be about 2.7 to 3.1 MB each (measured: 2,786,554 bytes for motion-time and 3,059,881 for zoom-cr) and must be under 15,728,640 bytes; the 480p15 check files are about 1.5 to 1.6 MB.
If the session cannot afford the 720p render, the 480p files are under 4 MB and the design note says the 720p size is untested.

Iterating on one beat (not part of the deliverable): `PYTHONPATH=videos BEATS=ring ~/.venvs/manim/bin/manim -ql --disable_caching --media_dir <a private scratch dir> -o x videos/scenes/zoom-cr.py Main`. **Warning:** every run, filtered or not, makes `NarratedScene.tear_down` rewrite `media/video/<id>.vtt`
with the cues of the beats it ran, so a filtered run leaves a partial `.vtt`; finish with the full `render.mjs` command above before testing. Use a private `--media_dir` so no other render shares your `Tex` cache (D14).

### 7.2 A2: the unit test (`tests/unit/i2-videos-ch2.test.mjs`, source in appendix D)

Run `node --test tests/unit/i2-videos-ch2.test.mjs`; passing is `# tests 20`, `# pass 20`, `# fail 0` (the four U6 tests skip, with a reason, for a film that has no mp4 yet). `npm test` as a whole must not gain a failure (the known-red items of the plan are not this goal's).

| Test | Checks | Expected |
|---|---|---|
| U1 narration JSON | for both: `id` = file stem; `title`; `summary` ≥ 40 chars; `station` is `mappings` / `derivative` and equals `STATIONS.find(s => s.video === id).id`; `music.prompt` ≥ 20 chars, `music.seconds` in 20..40; segment ids equal `intro, stroke, linear, square, recip, paper` and `intro, ring, move, quotient, mirror, cr, abs2` in order, unique, `/^[a-z0-9-]+$/`; 12 to 60 words each; no `$` or `\`; total 300 to 450 words | words per segment 47, 54, 54, 55, 60, 56 (326) and 38, 47, 55, 59, 53, 58, 48 (358) |
| U1b frozen counts | the per-segment word counts above; the predicted silent length `Σ max(1.5, w/2.5) + 0.35` | 132.50 s and 145.65 s (±0.01), inside 120..180 |
| U2 scenes | `self.beat("…")` ids (regex) equal the segment ids in order, once each; `class Main(NarratedScene)`; `narration_id`; imports `lib.narrated` and `lib.palette` (with `INPUT` and `OUTPUT`); uses `CART POLAR INPUT OUTPUT INK MUTED BG`; no `#rrggbb`, no `"#rgb"` string; no manim colour constant (`RED BLUE GREEN WHITE BLACK YELLOW ORANGE PINK PURPLE TEAL GOLD MAROON GRAY GREY`, with `_A.._E` suffixes) in the code (comments and docstrings stripped); no `requests`, `urllib`, `socket`, `subprocess`, `open(`; no bare `self.wait(<number>)` | 6 and 7 beat ids |
| U2b run times | every `run_time=`/`run=` value is a fraction of `t` or a number ≤ 0.35 | none violates |
| U3 text | motion-time contains `u equals 4 minus y squared`, `v equals 4y`, `Re w equals one half` and `real part one half`, `Cartesian`, `polar`, `focus`, `parabola`, `w equals i z minus 2 i`, `parametrize, push forward, eliminate`, `circle opens into a line`, `inverts the length and flips the angle`; zoom-cr contains `centre A` (or `center A`), `radius` followed by `B` in one sentence, `no mirror`, `u sub x equals v sub y`, `u sub y equals minus v sub x`, `2z plus 1`, `Cartesian`, `polar`, `microscope`, `Cauchy-Riemann`, `conjugate of z zero`, `Opposite directions share a dot`, `nowhere` | all present |
| U4 markers | motion-time: `def check_numbers():` and `check_numbers()` as the first statement of `construct`; `zout = lambda s: zin(s) ** 2`; `zout = lambda s: 1 / zin(s)`; `w.imag ** 2 / 16`; `.real - 0.5) < 1e-9`; `1j * complex(2, y) - 2j`. zoom-cr: `return (fx - 1j * fy) / 2, (fx + 1j * fy) / 2`; `f_conj`, `f_zz`, `f_abs2`, `f_re` defined; `z * z + z`; `abs(A - (2 * z0 + 1)) < 1e-6`; `abs(A - z0.conjugate()) < 1e-6`; `abs(B - z0) < 1e-6`; `Z0 = complex(0.5, 0.5)` (all compared with whitespace removed) | present |
| U5 numbers (8 tests) | the values of 6.3 against `js/core/complex.js` (mul, div, inv, exp, Arg, abs, directionalQuotients, localLinear, jacobian) | 1e-9 (1e-6 for the numeric derivatives, 1e-4 for the ρ = 1e-6 quotients) |
| U6 rendered files (4 tests) | per film that has a `.vtt` / `.mp4`: cue count, text and contiguity; size < 15 MB (< 4 MB when 480p); duration 120..180 and within 1.0 s of 132.5 / 145.65; manifest entry | skipped until rendered |

### 7.3 The interaction script (`tests/interact/i2-videos-ch2.mjs`, source in appendix E)

```
node tools/smoke.mjs --route mappings,derivative --script tests/interact/i2-videos-ch2.mjs --out docs/review/iter-2/i2-videos-ch2
node tools/smoke.mjs --route mappings,derivative --script tests/interact/i2-videos-ch2.mjs --dark --no-shots
```

It runs at desktop (1280), phone (390) and, with `--dark`, dark desktop, on both routes. It touches nothing on the stations. Steps, each an `assert` with a message that names the film and the thing:
1. Re-serve `media/video/*` with `Content-Type` `text/vtt` and `video/mp4` (`page.route` + `route.fetch` + `route.fulfill`), as GitHub Pages does (the harness's server sends `application/octet-stream`).
2. `import('./media/manifest.js')` in the page: both films present with `station`, `src` `media/video/<id>.mp4`, `captions` `media/video/<id>.vtt`, `seconds` in 120..180 (a missing entry fails with the command to run).
3. Fetch `media/narration/videos/<id>.json` and `media/video/<id>.vtt`: the file starts `WEBVTT`; as many cues as segments (6 and 7); segment ids equal the beats; cue `i` text equals segment `i` text; cue 0 starts at 0 and each cue starts where the previous ended (±2 ms); the last cue ends within 1.5 s of the manifest `seconds`.
4. Fetch `media/video/<id>.mp4`: bytes 4 to 8 are `ftyp`; size between 200,000 and 15,728,640 bytes.
5. The panel in a real browser: if the station already embeds `#video-<id>`, inspect it, else build one with `videoPanel(host, id)` from `js/core/listen.js` on a fixture host in `#view` (and remove the fixture afterwards). Assert: `video[controls][playsinline][preload=metadata]`; `source[src=media/video/<id>.mp4]`; `track[kind=captions][default][src=media/video/<id>.vtt]`; heading starts `Watch (2–3 min)`; summary contains `Silent, with captions` or `With voice and captions`; set `track.track.mode = 'hidden'`, wait for the track `load`, and the browser must have parsed **6** (motion-time) or **7** (zoom-cr) cues in order; `data-state` is `ready` or `error` within 4 s (the harness's Chromium has no H.264 decoder, so `error` is accepted and logged: "this Chromium cannot decode the H.264 stream: structure and captions checked, playback not"); the panel is no wider than the viewport (952 px at 1280, 358 px at 390); the page does not overflow; and, when embedded by the station, it comes after the station's first `canvas` or `svg`.
6. `expectedErrors` excuses only a failed media load of the two film files (`request failed: …/media/video/(motion-time|zoom-cr).mp4`, a decoder console error); a 404 for anything else fails the run.

Passing looks like (prototype, with the stations not yet embedding the panels):

```
  [mappings desktop] manifest lists both films with their stations, sources and captions
  [mappings desktop] captions equal the narration, cue by cue, in order
  [mappings desktop] both mp4 files are real mp4 files under 15 MB
  [mappings desktop] this Chromium cannot decode the H.264 stream: structure and captions checked, playback not
  [mappings desktop] (not embedded on #mappings yet: that is i2-decisions-everywhere; the fixture panel was checked instead)
  [mappings desktop] motion-time: panel ok at desktop width (952 px), 6 cues parsed by the browser
ok   mappings (desktop)  ...  6/6 checks passed across 2 route(s).
```

Negative test (done on the prototype): changing one word of a cue in `motion-time.vtt` fails the run with `motion-time: cue 2 (linear) text differs from the narration` at every view.

### 7.4 A3: the stills

Extract every still at the cue start plus 0.5 s, and the extra stills of the table, with this script (it reads the cue times from the `.vtt`; `-nostdin` matters in a shell loop):

```python
# run from the repo root: python3 stills.py   (writes docs/review/iter-2/i2-videos-ch2/<id>-<beat>.png)
import json, re, subprocess, pathlib
out = pathlib.Path('docs/review/iter-2/i2-videos-ch2'); out.mkdir(parents=True, exist_ok=True)
EXTRA = {('motion-time', 'intro'): [10], ('motion-time', 'linear'): [14], ('motion-time', 'square'): [14], ('motion-time', 'recip'): [20], ('motion-time', 'paper'): [14],
         ('zoom-cr', 'intro'): [12], ('zoom-cr', 'move'): [16, 21], ('zoom-cr', 'mirror'): [12], ('zoom-cr', 'cr'): [22], ('zoom-cr', 'abs2'): [3.5, 17]}
for film in ('motion-time', 'zoom-cr'):
    vtt = open(f'media/video/{film}.vtt').read()
    starts = [int(h) * 3600 + int(m) * 60 + float(s) for h, m, s in re.findall(r'^(\d\d):(\d\d):(\d\d\.\d+) -->', vtt, re.M)]
    beats = [s['id'] for s in json.load(open(f'media/narration/videos/{film}.json'))['segments']]
    for st, b in zip(starts, beats):
        for off in [0.5] + EXTRA.get((film, b), []):
            name = f'{film}-{b}.png' if off == 0.5 else f'{film}-{b}-plus{off}.png'
            subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-ss', str(st + off), '-i', f'media/video/{film}.mp4', '-frames:v', '1', str(out / name)], check=True)
```

Pixel positions (for a 854 × 480 still: `px = (x + 7.111) · 60`, `py = (4 − y) · 60`; for 1280 × 720 multiply by 90 instead of 60). Read the images with the image tool. What passing looks like, still by still:

| Still | Must show | Spot checks |
|---|---|---|
| `motion-time-intro` (+0.5 s, then `-plus10`) | headline "A function is a motion"; the z-plane with 15 green dots on a 3 × 5 lattice (x = 0.5, 1, 1.5); the w-plane frame; the arrow `f`; foot `f(z) = z²` | frame 0 is this picture; at +0.5 s the carry has just begun (the first dots are leaving, turning pink): see `-plus10` for the 15 pink images and the 15 arcs |
| `motion-time-stroke` (+0.5 s) | the stroke in INPUT green, **dark to light** from its start to the arrowhead, with dots at t = 0, ¼, ½, ¾, 1 (steel blue to white); its image in OUTPUT pink with the same ramp and dots; a white cursor ring on each at t ≈ 0.02 joined by a dashed line; the clock bar | `t = 0.02`; the z cursor at about (141, 241) px, the w cursor near (574, 200) px (480p); the probe script below prints `stroke still: ramp and hues ok` |
| `motion-time-linear` (+0.5 s, then `-plus14`) | the vertical line x = 2 (green) on the z-plane and its pink copy with the two blue basis arrows on the w-plane; `-plus14`: the pink line horizontal on the real axis (v = 0), arrowhead pointing left, basis arrows at −2i, labels `slide: −2i` and `x = 2 ↦ v = 0` | foot `w = iz − 2i = i(z − 2)` throughout |
| `motion-time-square` (+0.5 s, then `-plus14`) | the vertical line x = 2 and its **parabola** (opening left, vertex near u = 4) with the ring **`focus 0`** at the origin of the w-plane, label `u = 4 − v²/16`, clock bar at `t = 0.02`; `-plus14`: the line and parabola faded, the orange ray, arc, circle and the readouts `θ = Arg z = 28°`, `2θ = Arg w = 56°` (θ between 24° and 30°; the second is always exactly twice the first, because θ is rounded once and 2θ is derived from it), `r = 2.5`, `r² = 6.25` | |
| `motion-time-recip` (+0.5 s, then `-plus20`) | the circle `\|z − 1\| = 1` with **0 marked** and the **line Re w = ½ clearly off the v-axis**; the z cursor near 0 (just below it), its image cursor parked at the top edge by an arrow "to infinity"; readouts `r = \|z\| = 0.39 → 1/r = 2.57` and `θ = Arg z = −79° → −θ = 79°`, `t = 0.06` | the line is at px 652 and the v-axis at px 613 (480p): 39 px apart, 58 px at 720p; `-plus20`: `t = 0.95`, the cursor back near 0, its image at the bottom edge |
| `motion-time-paper` (+0.5 s, then `-plus14`) | the three cards `1  Parametrize`, `2  Push forward`, `3  Eliminate y` with their formulas (`z = 2 + iy`, `z(t) = a + t(b − a)`; `u = 4 − y²`, `v = 4y`; `y = v/4`, `u = 4 − v²/16`) and the POLAR frame on card 1; the two small planes above show x = 2 and the parabola; `-plus14`: the frame on card 3 | |
| `zoom-cr-intro` (+0.5 s, then `-plus12`) | a straight green-blue grid on the left, a curved grid on the right, `zoom ×1`, `f(z) = z² + z`; `-plus12`: `zoom ×20`, the right grid a straight lattice turned by about 27° with cells about 2.2 times bigger, and "turned and stretched" | |
| `zoom-cr-ring` (+0.5 s) | **a small ring of 24 arrows around z₀** (green, left) and the ring of their images (pink, right, bigger and turned), one white arrow on each, the label `z₀` outside the ring | ring radius 60 px (480p) centred at (202, 252) px |
| `zoom-cr-move` (+0.5 s, `-plus16`, `-plus21`) | the rings with the white φ = 0 arrow and its image, the orange turn arc and `Arg f′ = 26.6°`, `\|f′\|ρ = √5 ρ`; `-plus16`: the `Cartesian` column `f′(z₀) = u_x + i v_x = 2 + i`; `-plus21`: both columns, `polar` `f′(z₀) = √5 e^{i 26.6°}` | |
| `zoom-cr-quotient` (+0.5 s) | **dots on a dashed circle with its centre labelled A and the radius \|B\| drawn**; on the left the ring with a white pair of opposite arrows; foot `Δw/Δz → A + Be^{−2iφ}` and "opposite arrows, same dot" | 12 distinct dots (24 arrows, pairs coincide); the circle passes through the axes' crossing |
| `zoom-cr-mirror` (+0.5 s, `-plus12`) | **two panels**: left conj z, a dashed circle of radius 1 with `\|B\| = 1` and "never shrinks"; right z² + z, a tiny ring around a green point labelled **`f′ = 2z + 1`**; `ρ = 0.10`; `-plus12`: the left panel is Re z (circle of radius ½, `\|B\| = ½`, "Re z: never shrinks either"), the right ring is smaller, `ρ = 0.06` | |
| `zoom-cr-cr` (+0.5 s, `-plus22`) | **`u_x = v_y` and `u_y = −v_x`**, "no mirror part", **the matrix [[u_x, u_y], [v_x, v_y]] = [[a, −b], [b, a]]**; the plane with the unit square; `-plus22`: the square has become a turned, stretched square (side √5), the arc 26.6°, `a = 2, b = 1`, both columns | |
| `zoom-cr-abs2` (+0.5 s, `-plus3.5`) | z₀ on its way to 0, the dashed circle (centre `A = z̄₀`, radius \|z₀\|) and its dots; readout **`\|B\| = \|z₀\| = 1.48`** at +0.5 s and **`1.12`** at +3.5 s: the circle is visibly smaller in the later still (radius ratio 0.76); `-plus17`: the point `f′(0) = 0` (green) and no circle | |

The colour probe used in the table (optional aid; Python 3 with Pillow) samples the stroke at t = 0.1 and 0.9 on both planes and asserts: INPUT green-dominant, OUTPUT pink (red and blue above green), the light end brighter than the dark end by at least 15 luma units.

```python
# probe_stroke.py <still.png>: A3 colour probe for motion-time-stroke (any size of still)
import math, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size
px = lambda x, y: ((x + 7.1111) * W / 14.2222, (4 - y) * H / 8)
def zin(t): return complex(0.5 + 2 * t, 1.4 * math.sin(2 * math.pi * t))
def at(c, focus, scale, z): return (c[0] + (z.real - focus.real) * scale, c[1] + (z.imag - focus.imag) * scale)
def sample(x, y, r=2):
    cx, cy = px(x, y); pts = [im.getpixel((int(cx) + i, int(cy) + j)) for i in range(-r, r + 1) for j in range(-r, r + 1)]
    return tuple(sum(c[k] for c in pts) / len(pts) for k in range(3))
lum = lambda c: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
L = lambda z: at((-3.75, -0.2), 1.5 + 0j, 1.0, z); R = lambda z: at((3.75, -0.2), complex(2.6, -1.4), 0.55, z)
a1, a9 = sample(*L(zin(0.1))), sample(*L(zin(0.9))); b1, b9 = sample(*R(zin(0.1) ** 2)), sample(*R(zin(0.9) ** 2))
assert a1[1] > a1[0] + 20 and a9[1] > a9[0] + 20, "INPUT stroke must be green-dominant"
assert b1[0] > b1[1] + 15 and b1[2] > b1[1] + 15 and b9[0] > b9[1] + 15, "OUTPUT stroke must be pink (R and B above G)"
assert lum(a9) > lum(a1) + 15 and lum(b9) > lum(b1) + 15, "light end brighter than dark end"
print("stroke still: ramp and hues ok")
```

### 7.5 A4: code inspection checklist

1. `motion-time.py`: the parabola is `zout = lambda s: zin(s) ** 2` of the line `2 + iy` (not a hand-typed parabola) and `check_numbers()` asserts `u = 4 − y²`, `v = 4y`, `u = 4 − v²/16` for `y` from −3 to 3; the reciprocal image is `1 / zin(s)` of `2cos θ e^{iθ}` and `check_numbers()` asserts `|z − 1| = 1`, `Re(1/z) = ½` and `Im(1/z) = −½ tan θ`; the linear map is evaluated as `1j * complex(2, y) - 2j` (real axis); the polar act uses `r_in = 2.5`, `r_out = 6.25` and `check_numbers()` asserts `|z²| = 6.25`, `Arg z² = 60°` for `z = 2.5e^{i30°}`; the 1.5.1 line is asserted to end at −3 − 3i.
2. `zoom-cr.py`: `AB(f, z0)` is `((fx − i fy)/2, (fx + i fy)/2)` from central differences; the three examples are `f_conj` (A = 0, B = 1), `f_zz` (A = 2z + 1, B = 0) and `f_abs2` (A = conj z₀, B = z₀), asserted at three points, plus `f_re` (A = B = ½); `quotient()` is asserted against `A + B e^{−2iφ}` for all 24 directions and the four functions; the Jacobian [[2, −1], [1, 2]], `f(z₀) = ½ + i` and `f′ = 2 + i = √5 e^{i·26.565°}` are asserted; the circle drawn in `quotient`, `mirror` and `abs2` has centre `A` and radius `|B|` taken from `AB`/closed forms, never typed.
3. Neither file contains a literal colour, a network call, a file write or a bare long `run_time`; both import from `lib.palette`; `Main` subclasses `NarratedScene`; `narration_id` equals the file stem.

### 7.6 Measured results of the prototype (informational)

- `node --test tests/unit/i2-videos-ch2.test.mjs`: 20 of 20, run against the rendered 480p files (U6 not skipped). `node tools/smoke.mjs --route mappings,derivative --script tests/interact/i2-videos-ch2.mjs --dark --no-shots`: `6/6 checks passed across 2 route(s).`
- 480p15 renders (the prototype's final sources, before the fix round of 0.4, which lengthened zoom-cr to a predicted 145.65 s): `motion-time` 132.40 s, 1,566,275 bytes; `zoom-cr` 143.13 s, 1,585,018 bytes (predicted 132.50 and 143.25). Cue starts: motion-time 0, 19.133, 41.067, 63.000, 85.333, 109.667; zoom-cr 0, 15.533, 34.667, 57.000, 78.533, 100.067, 123.600 (the prediction is within 0.1 s at every cue).
- 720p30 renders: `motion-time` 132.40 s, 2,786,554 bytes (2.66 MB); `zoom-cr` 143.13 s, 3,059,881 bytes (2.92 MB); both H.264, yuv420p, 1280 × 720 at 30 fps, about 160 to 175 kb/s; CPU time 4 min 26 s and 2 min 37 s (20 and 6 minutes of wall time on the loaded machine, with a cold `Tex` cache). On these files the stroke colour probe passes and the Re w = ½ line is 58 px from the v-axis at 1280 px (977 px against 919 px), as computed.
- CPU time of a full 480p render: `motion-time` 1 min 59 s, `zoom-cr` 1 min 03 s; wall time 2 to 8 minutes on a machine with a load average of 14 to 39. A one-beat render (`BEATS=…`): 20 to 45 s of CPU.
- Stills reviewed by eye at 854 × 480 and 1280 × 720: every row of the 7.4 table.
- The first prototype's problems that this design now rules out: stale labels from one beat on the next (D2), a dim label under a plane frame (D2), `MathTex` rebuilt per frame (D13), a header colliding with the plane titles (header and titles now on separate rows), readouts wider than the frame (24 pt), animations that ended a sentence before or after the words they illustrate (the fractions of 5.4 and 5.5 are placed against the spoken sentences), two parallel renders sharing a `Tex` directory (D14).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | What happens / what the design does |
|---|---|
| `manim`, `latex` or `dvisvgm` missing | `render.mjs` prints "manim not found" (exit 1) or manim raises a LaTeX error at the first `MathTex`. Not a design failure: `tools/local/setup.sh` installs the toolchain; `MANIM=/path/to/manim` overrides the lookup. Both are present in the reference environment (manim 0.22.0, `/usr/bin/latex`, `/usr/bin/dvisvgm`). |
| `latex failed but did not produce a log file` | Two manim processes shared a media directory (D14). Run the same command again: the `Tex` cache is content-addressed and the finished files are reused. |
| A `MathTex` string that does not compile | The scene stops at that beat with the TeX error; every string in the appendices compiles (the `Tex` cache of the prototype holds them). Packages used: the default manim template only (`amsmath`: `pmatrix`, `\text`, `\mathrm`, `\tfrac`, `\bar`, `\varphi`). |
| The voiced render | `beat()` returns the clip length plus 0.35 s. Every animation is a fraction of `t`, so nothing overruns; a clip much longer than the silent estimate leaves a longer final hold (the last picture of every beat is a complete study card); a clip so short that 0.03 t falls under one frame (about 1 s at 30 fps) would be raised to a frame with a warning (no segment is that short: the shortest has 38 words). |
| A filtered render (`BEATS=...`) | Writes a partial `.vtt` (7.1 warning). `on()` returns True for every beat when the variable is unset, which is what `render.mjs` does. |
| A point goes to infinity (`recip`) | The image of z near 0 under 1/z is clamped to the frame edge (`cursor(clamp = 2.4)`), a "to infinity" arrow stands there, and the stroke is cut at the box: no segment is ever drawn across the plane or outside it. z never equals 0 in the film (the clock runs 0.05 to 0.95; the samples 0.004 to 0.996), so `1/z` and `abs(z)` never divide by zero. |
| `\|z\|²` at z₀ → 0 (`abs2`) | `quotient()` divides by `h = ρe^{iφ}` with ρ = 1e-3, never by 0; at z₀ = 0 the dots are `ρ e^{−iφ}`: a circle of radius 0.001, a point on screen; the dashed circle has radius `max(\|z₀\|·1.25, 0.03)` so `DashedVMobject` never gets a zero radius. |
| Curved grid far from z₀ (`intro` at ×1) | `grid_image` samples ±3.6 cells, the image can be huge; `runs()` drops every point outside the box or not finite, so the picture is the part inside the frame, with at most one sample of gap at the edge. |
| `DashedVMobject` and `Arc` of angle 0 | `Arc(angle = max(φ, 1e-3))` in `ring` and `cr` avoids an empty arc at φ = 0; `run_time` is never 0. |
| Fonts | `Text` uses the machine's default family through Pango (a serif on the reference Linux box). Layout margins are at least 0.12 units to every frame edge, so a wider font does not clip the readouts; Greek letters, `×`, `−`, `°` and `→` fall back automatically when a font lacks them. After rendering on a Mac, look at the stills once more. |
| The manifest after other goals render | `writeManifest()` lists every scene with an mp4: this goal's two entries are always there; the other three appear when their goals have rendered. Re-run `node tools/videos/render.mjs --manifest-only` last. |
| File size | 1.6 MB (480p15) to 3.1 MB (720p30) measured; under 15 MB by a wide margin. If a future change pushes a render over, lower the grid sample counts in the `intro` or the dash counts (48) first; the encoder is manim's default. |

### 8.2 Performance plan

Covered in 5.6: one layout for every quality; at most about 60 mobjects rebuilt per frame; no LaTeX in a frame loop; `Text` readouts at about 15 ms each; first render compiles about 60 TeX strings per film and caches them; CPU time of a full 480p render is 1 min 59 s and 1 min 03 s, a 720p render about 2.5 times that (4 min 26 s and 2 min 37 s).
There is no runtime performance concern on the site: the films are static files; `preload="metadata"` fetches a few kilobytes until the student presses play, and the files are 1.6 to 3.1 MB (the whole site works offline without them).

### 8.3 Accessibility

- **Captions are the narration**: `<track kind="captions" default>` with one cue per beat; screen readers get the text through the text track and through `aria-describedby` (the summary line). `media/narration/videos/<id>.json` is the full transcript; a transcript view in the station (`<details>` with the segments) is a suggestion for `i2-decisions-everywhere-b` and `-c`, not part of this goal.
- **Nothing is carried by colour alone**: the clock is also the dots and the `t = …` readout; input and output are also left and right and the titles `z = x + iy`, `w = u + iv`; the mirror part is also the word "mirror", "never shrinks" and `|B|`; the derivative is also the label `f′ = 2z + 1` and the words "no mirror part". A student who cannot tell green from pink still has the planes' positions and titles.
- **Contrast** against the film background (WCAG): INK 15.97, MUTED 8.59, CART 7.84, POLAR 9.13, INPUT 9.59, OUTPUT 8.17, WARN 7.73, OK 9.75; the darkest end of a stroke 5.87 to 6.53 (3.1). Tick labels (MUTED on the plane fill, 7.8) are decoration.
- **Text size**: informative text is font_size 24 or larger; the sub-lines are 24 (MUTED, 22 px caps at 720p), everything the narration depends on is 26 and above (3.3); 18 pt is only the ticks.
- **No flashing and no autoplay.** The only pulse is one `Indicate` of the turn arc (0.1 t, once); no element changes more than twice per second; the player starts paused.
- **Keyboard and touch**: the native player (2.1): Tab to the player, Space or K, arrow keys, F, C; tap targets are the browser's.

### 8.4 Reduced motion

A video is a media element the student starts; nothing here autoplays or loops, and the station must not start it (`listen.js` does not). `prefers-reduced-motion` therefore needs no film-side switch: the student chooses when anything moves, can pause on any beat (each beat's first half-second is its complete picture), and can seek by dragging. Motion in the films runs from about 0.2 to about 2.5 scene units per second (the fastest is the rider of `quotient` and the image cursor of `recip`), nothing flashes, and the one zoom (`intro`, 9 s) is a smooth log-scale ease. A student who wants no motion at all reads the paused cards and the captions: every beat's study card is a labelled picture.

### 8.5 Phone layout

The player is 358 × 201 px at 390 px (`listen.js` sets `width: 100%; aspect-ratio: 16/9`). The frame is a fixed 16:9 raster, so on a phone the text is small (cap heights 4.6 to 15 px, table in 2.2): the captions (drawn by the browser) and the full-screen control (3 to 4 times the pixels, landscape) carry the reading, and the pictures are designed to be understood without reading (a ring, a circle, a line that bends). The interaction script asserts that the panel is no wider than the viewport (358 px at 390) and that the page does not overflow at 390 px. Nothing in the films depends on hover.

---

## 9. Out of scope, requests for other owners, risks

**Out of scope.** Audio (generated on the student's machine by `npm run media`); embedding the films in the stations (`i2-decisions-everywhere-b` for `mappings`, `-c` for `derivative`; the station narration of `derivative` is `i2-media-core`'s); the 4D film (`i2-videos-4d`) and the two Chapter 1 films (`i2-videos-ch1`); any change to `videos/lib/*`, `tools/videos/render.mjs`, `tools/smoke.mjs`, `js/core/listen.js`, `js/registry.js` or `media/manifest.js` (generated); a transcript view or a light-theme render of the films; the `P5`/`2.3.1` limit pictures (those live in the `limits` station); a film of 2.4.1 (branches) or 2.2.x (the powers and root films are `i2-videos-ch1`).

**Requests for other owners** (none blocks this goal):
1. `tools/smoke.mjs` (the orchestrator): add MIME entries `.mp4` `video/mp4`, `.vtt` `text/vtt` and `.mp3` `audio/mpeg` to the static server, so the station scripts that embed videos need no `page.route` workaround (this goal's script re-serves the files itself and works either way).
2. `i2-decisions-everywhere-b` and `-c`: embed with `videoPanel(container, 'motion-time')` on `mappings` and `videoPanel(container, 'zoom-cr')` on `derivative`, after the station's first picture; `tests/interact/i2-videos-ch2.mjs` already checks an embedded panel (structure, cues, placement, width).
3. The integrator: after the three video goals have rendered, run `node tools/videos/render.mjs --manifest-only` once so `media/manifest.js` lists all five films; decide whether to commit `media/video/*.mp4` (1.6 to 3.1 MB each at the sizes measured).
4. `docs/ARCHITECTURE.md` 11.8: "300 to 450 narration words" cannot all fit 120 to 180 s (S1); the usable ceiling is about 440 words for 6 to 7 segments.
5. `tools/videos/render.mjs` (optional, no owner this wave): render each scene into its own media subdirectory, or serialise renders, so two builders cannot race on `build/manim/Tex` (D14).

**Risks.**
- The toolchain (manim, LaTeX, ffmpeg) is the student's local setup as well as this box: if `render.mjs` cannot run in the builder's session the films cannot be produced there; the prototype shows the full pipeline works with the installed versions.
- Render wall time on a loaded machine: 2 to 6 minutes per film at 480p and up to 15 at 720p when the machine is busy; run the films one at a time (D14) and use `BEATS` to iterate.
- A partial `.vtt` from a filtered run or an aborted render: always finish with the full `render.mjs` and re-run U6.
- The harness's Chromium cannot decode H.264: playback itself is not asserted anywhere; the captions are checked as parsed text-track cues, and the files with `ffprobe`.
- Phone legibility of on-screen text (8.5): mitigated by captions, full screen and pictures that do not need the text.
- The `mirror` still at +0.5 s shows a small ring rather than a perfect point (S3); `abs2` is where the shrink is seen.
- The fonts on the student's Mac differ from this box's: re-check the stills after any render there.
- Voice-over timing: the voiced beats follow the clips; a clip far from 2.5 words per second moves the animation proportionally, which is intended, but the sync notes of 5.4 and 5.5 are for the silent timing.

---

## Appendices: the prototype as it ran

The appendices are the throwaway prototype of this design, verbatim. They were rendered, tested and run as described in 7.6. A builder may copy them as the starting point; where an appendix and sections 0 to 8 differ, the sections are binding and the difference is a defect of the appendix. The scene files are shown without the narration JSON they read (appendix C).

### Appendix A. `videos/scenes/motion-time.py`

```python
"""motion-time: a function is a motion with a clock. Reference prototype of docs/designs/iter-2/i2-videos-ch2.md."""
import cmath
import math
import os

import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, T0, T1, WARN, OK, mix, ramp

RAMP_W = 0.45        # strokes: (1 - w) * base + w * ramp(t); the site's plane.js uses 0.4
DOT_W = 0.85         # clock dots and arrow tips: nearly the pure ramp so the clock reads
BOX_W, BOX_H = 6.2, 5.2
LEFT_C, RIGHT_C = (-3.75, -0.2), (3.75, -0.2)
CLOCK_TS = (0.0, 0.25, 0.5, 0.75, 1.0)
Y_TITLE, Y_FOOT = 2.72, -3.45


# ---------------------------------------------------------------- the numbers of the story (asserted once, at the top of construct)
def check_numbers():
    for y in np.linspace(-3, 3, 13):
        w = complex(2, y) ** 2                                         # 2.1.2: x = 2 under z^2
        assert abs(w.real - (4 - y * y)) < 1e-9 and abs(w.imag - 4 * y) < 1e-9
        assert abs(w.real - (4 - w.imag ** 2 / 16)) < 1e-9             # u = 4 - v^2/16, focus 0
        w = 1j * complex(2, y) - 2j                                    # 2.1.3: x = 2 under iz - 2i lands on v = 0
        assert abs(w.imag) < 1e-12 and abs(w.real + y) < 1e-12
    for th in np.linspace(-1.5, 1.5, 13):
        z = 2 * math.cos(th) * cmath.exp(1j * th)                      # 2.5.1: |z - 1| = 1
        assert abs(abs(z - 1) - 1) < 1e-9
        assert abs((1 / z).real - 0.5) < 1e-9 and abs((1 / z).imag + 0.5 * math.tan(th)) < 1e-9   # Re w = 1/2
    z = 2.5 * cmath.exp(1j * math.radians(30))                         # polar: r -> r^2, theta -> 2 theta
    assert abs(abs(z * z) - 6.25) < 1e-9 and abs(cmath.phase(z * z) - math.radians(60)) < 1e-9
    assert (2 - 5 * 1.0, 1 - 4 * 1.0) == (-3.0, -3.0)                  # 1.5.1: z(t) = (2 - 5t) + i(1 - 4t) ends at -3 - 3i


# ---------------------------------------------------------------- a framed complex plane
class Plane:
    """`focus` (a complex number) sits at the centre of a box of BOX_W x BOX_H scene units; `scale` screen units per unit."""

    def __init__(self, centre, focus=0j, scale=1.0, box=(BOX_W, BOX_H)):
        self.cx, self.cy = centre
        self.focus = complex(focus)
        self.scale = scale
        self.w, self.h = box

    def pt(self, z):
        z = complex(z)
        return np.array([self.cx + (z.real - self.focus.real) * self.scale, self.cy + (z.imag - self.focus.imag) * self.scale, 0.0])

    def inside(self, z, pad=0.0):
        p = self.pt(z)
        return abs(p[0] - self.cx) <= self.w / 2 - pad and abs(p[1] - self.cy) <= self.h / 2 - pad

    def axes(self):
        """Frame, axes through 0 when visible, integer (or nice-step) ticks with labels kept 0.35 clear of the corners."""
        g = VGroup(Rectangle(width=self.w, height=self.h, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.8,
                             fill_color=SURFACE, fill_opacity=0.55).move_to([self.cx, self.cy, 0]))
        hx, hy = self.w / 2 / self.scale, self.h / 2 / self.scale
        x0, x1 = self.focus.real - hx, self.focus.real + hx
        y0, y1 = self.focus.imag - hy, self.focus.imag + hy
        s = next((s for s in (1, 2, 5, 10, 20) if s * self.scale >= 0.85), 50)
        for k in range(math.ceil(x0 / s), math.floor(x1 / s) + 1):
            x = k * s
            p = self.pt(complex(x, y0))
            if x != 0 and abs(p[0] - self.cx) < self.w / 2 - 0.35:
                g.add(Line(self.pt(complex(x, y0)), self.pt(complex(x, y1)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(str(x).replace("-", "−"), font_size=18, color=MUTED).move_to(p + np.array([0, 0.17, 0])))
        for k in range(math.ceil(y0 / s), math.floor(y1 / s) + 1):
            y = k * s
            p = self.pt(complex(x0, y))
            if y != 0 and abs(p[1] - self.cy) < self.h / 2 - 0.35:
                g.add(Line(self.pt(complex(x0, y)), self.pt(complex(x1, y)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(f"{y}i".replace("-", "−"), font_size=18, color=MUTED).move_to(p + np.array([0.27, 0, 0])))
        if x0 < 0 < x1:
            g.add(Line(self.pt(complex(0, y0)), self.pt(complex(0, y1)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        if y0 < 0 < y1:
            g.add(Line(self.pt(complex(x0, 0)), self.pt(complex(x1, 0)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        return g


def ramped(plane, zs, base, width=6.0, weight=RAMP_W):
    """A stroke as short round-capped segments coloured ramp(base, t), t = (k + 1/2)/(n - 1); segments with an end outside the box are skipped."""
    g = VGroup()
    n = len(zs)
    P = [plane.pt(z) for z in zs]
    for k in range(n - 1):
        if plane.inside(zs[k], 0.03) and plane.inside(zs[k + 1], 0.03):
            g.add(Line(P[k], P[k + 1], stroke_width=width, color=ramp(base, (k + 0.5) / (n - 1), weight), cap_style=CapStyleType.ROUND))
    return g


def clock_dots(plane, zfun, base, ts=CLOCK_TS):
    g = VGroup()
    for t in ts:
        z = zfun(t)
        if plane.inside(z, 0.06):
            g.add(Dot(plane.pt(z), radius=0.085, color=ramp(base, t, DOT_W), stroke_color=BG, stroke_width=2))
    return g


def end_tip(plane, zfun, base, t=1.0):
    d = zfun(t) - zfun(t - 0.01)
    return Triangle(fill_color=ramp(base, 1.0, DOT_W), fill_opacity=1, stroke_width=0).scale(0.13).rotate(math.atan2(d.imag, d.real) - PI / 2).move_to(plane.pt(zfun(t)))


def cursor(plane, zfun, clock, clamp=None):
    c = VGroup(Circle(radius=0.17, stroke_color=INK, stroke_width=3), Dot(radius=0.08, color=INK))

    def follow(m):
        p = plane.pt(zfun(clock.get_value()))
        if clamp is not None:
            p[1] = max(plane.cy - clamp, min(plane.cy + clamp, p[1]))
        m.move_to(p)
    c.add_updater(follow)
    follow(c)
    return c


def link(a, b):
    return always_redraw(lambda: DashedLine(a.get_center(), b.get_center(), color=MUTED, stroke_width=1.5, stroke_opacity=0.6, dash_length=0.12))


def clock_bar(tracker, centre=(3.25, Y_FOOT), width=3.8):
    n = 48
    cx, cy = centre
    bar = VGroup(*[Rectangle(width=width / n + 0.005, height=0.17, stroke_width=0, fill_opacity=1, fill_color=mix(T0, T1, (i + 0.5) / n))
                   .move_to([cx - width / 2 + (i + 0.5) * width / n, cy, 0]) for i in range(n)])
    labs = VGroup(Text("t", font_size=26, color=INK).move_to([cx - width / 2 - 0.35, cy, 0]),
                  Text("0", font_size=20, color=MUTED).move_to([cx - width / 2, cy - 0.27, 0]),
                  Text("1", font_size=20, color=MUTED).move_to([cx + width / 2, cy - 0.27, 0]))
    marker = always_redraw(lambda: Triangle(fill_color=INK, fill_opacity=1, stroke_width=0).scale(0.1).rotate(PI)
                           .move_to([cx - width / 2 + tracker.get_value() * width, cy + 0.21, 0]))
    read = always_redraw(lambda: Text(f"t = {tracker.get_value():.2f}", font_size=26, color=INK).move_to([cx + width / 2 + 0.95, cy, 0]))
    return VGroup(bar, labs, marker, read)


def plane_titles(left=r"z = x + iy", right=r"w = u + iv"):
    return (MathTex(left, font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]),
            MathTex(right, font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0]))


def headline(main, sub=None):
    g = VGroup(Text(main, font_size=34, color=INK).move_to([-6.85, 3.55, 0], aligned_edge=LEFT))
    if sub:
        g.add(Text(sub, font_size=24, color=MUTED).move_to([6.85, 3.5, 0], aligned_edge=RIGHT))
    return g


# Draw order of the slots (manim sorts by z_index): frames below curves below overlays below labels below cursors below the rest.
SLOT_Z = {"left": 0, "right": 0, "mid": 1, "cards": 1, "data_l": 1, "data_r": 1, "lab": 3, "focus": 3, "cur": 4,
          "over": 5, "over2": 5, "polar": 5, "ring": 5, "head": 6, "foot": 6}


class Stage:
    """Named slots. put(slot=group, ...) fades the old group of each slot out and the new one in, together, in one play.
    A group is faded in and out as a whole and nothing else ever adds to or fades a member of it separately."""

    def __init__(self, scene):
        self.scene = scene
        self.slots = {}

    def put(self, run=0.3, **kw):
        anims = []
        for name, new in kw.items():
            old = self.slots.get(name)
            if old is not None:
                for m in old.get_family():
                    m.clear_updaters()
                anims.append(FadeOut(old))
            if new is not None:
                new.set_z_index(SLOT_Z.get(name, 2))
                anims.append(FadeIn(new))
            self.slots[name] = new
        if anims:
            self.scene.play(*anims, run_time=run)

    def place(self, **kw):
        """Put groups on the stage at once, with no transition. Only the first beat of a film uses it, so that frame 0 is the intro card:
        the poster frame a browser shows before the student presses play."""
        for name, new in kw.items():
            new.set_z_index(SLOT_Z.get(name, 2))
            self.scene.add(new)
            self.slots[name] = new

    def cut(self, run=0.3, **kw):
        """Like put, but every slot not named is cleared: a beat starts from a clean stage."""
        names = set(self.slots) | set(kw)
        self.put(run=run, **{n: kw.get(n) for n in names})

    def freeze(self, name):
        if self.slots.get(name) is not None:
            for m in self.slots[name].get_family():
                m.clear_updaters()


class Main(NarratedScene):
    narration_id = "motion-time"

    def setup(self):
        super().setup()
        self.camera.background_color = BG
        self.st = Stage(self)
        self.only = {s for s in os.environ.get("BEATS", "").split(",") if s}

    def on(self, beat_id):
        return not self.only or beat_id in self.only

    def construct(self):
        check_numbers()
        if self.on("intro"):
            with self.beat("intro") as t:
                self.beat_intro(t)
        if self.on("stroke"):
            with self.beat("stroke") as t:
                self.beat_stroke(t)
        if self.on("linear"):
            with self.beat("linear") as t:
                self.beat_linear(t)
        if self.on("square"):
            with self.beat("square") as t:
                self.beat_square(t)
        if self.on("recip"):
            with self.beat("recip") as t:
                self.beat_recip(t)
        if self.on("paper"):
            with self.beat("paper") as t:
                self.beat_paper(t)

    # ------------------------------------------------------------ intro: every point is carried
    def beat_intro(self, t):
        L = Plane(LEFT_C, focus=1.0, scale=1.0)
        R = Plane(RIGHT_C, focus=0.0, scale=0.5)
        pts = [complex(x, y) for x in (0.5, 1.0, 1.5) for y in (-1.5, -0.75, 0.0, 0.75, 1.5)]
        f = lambda z: z * z
        d_in = VGroup(*[Dot(L.pt(z), radius=0.09, color=INPUT) for z in pts])
        ghosts = VGroup(*[Dot(L.pt(z), radius=0.09, color=INPUT) for z in pts])      # they leave the input dots green and turn pink on the way
        arrow = Arrow([-0.45, 0.2, 0], [0.45, 0.2, 0], buff=0, color=MUTED, stroke_width=4)
        f_lab = MathTex(r"f", font_size=40, color=INK).next_to(arrow, UP, buff=0.05)
        a, b = plane_titles()
        self.st.place(head=headline("A function is a motion", "it picks up every point"),
                    left=VGroup(L.axes(), a, d_in), right=VGroup(R.axes(), b),
                    mid=VGroup(arrow, f_lab, ghosts),
                    foot=VGroup(MathTex(r"f(z) = z^2", font_size=40, color=INK).move_to([0, Y_FOOT, 0])))
        targets = [Dot(R.pt(f(z)), radius=0.09, color=OUTPUT) for z in pts]
        self.play(LaggedStart(*[Transform(g, tg, path_arc=-0.7) for g, tg in zip(ghosts, targets)], lag_ratio=0.05), run_time=0.35 * t)
        arcs = VGroup(*[ArcBetweenPoints(L.pt(z) + np.array([0.12, 0, 0]), R.pt(f(z)) - np.array([0.12, 0, 0]), angle=-0.7, stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.45) for z in pts])
        self.st.put(run=0.15 * t, over=arcs)

    # ------------------------------------------------------------ stroke: the clock
    def beat_stroke(self, t):
        zin = lambda s: complex(0.5 + 2.0 * s, 1.4 * math.sin(2 * math.pi * s))
        zout = lambda s: zin(s) ** 2
        L = Plane(LEFT_C, focus=1.5, scale=1.0)
        R = Plane(RIGHT_C, focus=complex(2.6, -1.4), scale=0.55)
        ts = np.linspace(0, 1, 241)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        a, b = plane_titles()
        self.st.cut(head=headline("A stroke carries a clock", "the image keeps the clock"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT)),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT), end_tip(R, zout, OUTPUT)),
                    mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw),
                    foot=VGroup(MathTex(r"z(t),\ 0 \le t \le 1", font_size=36, color=INK).move_to([LEFT_C[0], Y_FOOT, 0]), clock_bar(clock)))
        self.play(clock.animate.set_value(1.0), run_time=0.8 * t, rate_func=linear)

    # ------------------------------------------------------------ linear: one turn, one slide
    def beat_linear(self, t):
        zin = lambda s: complex(2, -2.4 + 4.8 * s)
        L = Plane(LEFT_C, scale=1.0)
        R = Plane(RIGHT_C, scale=1.0)
        ts = np.linspace(0, 1, 101)
        a, b = plane_titles()
        lab_in = MathTex(r"x = 2", font_size=34, color=INPUT).move_to(L.pt(complex(2.6, 2.1)))
        e1 = Arrow(R.pt(0), R.pt(1), buff=0, color=CART, stroke_width=5, max_tip_length_to_length_ratio=0.3)
        e2 = Arrow(R.pt(0), R.pt(1j), buff=0, color=CART, stroke_width=5, max_tip_length_to_length_ratio=0.3)
        mover = VGroup(ramped(R, [zin(s) for s in ts], OUTPUT), clock_dots(R, zin, OUTPUT), end_tip(R, zin, OUTPUT), e1, e2,
                       Circle(radius=0.12, stroke_color=INK, stroke_width=3).move_to(R.pt(0)))
        self.st.cut(head=headline("Linear: one turn, one slide", "lines stay lines"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT)),
                    data_r=VGroup(mover), lab=VGroup(lab_in),
                    foot=VGroup(MathTex(r"w = iz - 2i = i(z - 2)", font_size=36, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])))
        turn = MathTex(r"\text{turn: }\times i", font_size=36, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0])
        slide = MathTex(r"\text{slide: }-2i", font_size=36, color=CART).move_to([RIGHT_C[0], Y_FOOT, 0])
        end = MathTex(r"x = 2 \;\mapsto\; v = 0", font_size=36, color=OUTPUT).move_to([RIGHT_C[0] + 1.0, 1.7, 0])
        self.wait(0.2 * t)
        self.st.put(run=0.03 * t, over=VGroup(turn))
        self.play(Rotate(mover, angle=PI / 2, about_point=R.pt(0), rate_func=smooth), run_time=0.15 * t)
        self.st.put(run=0.03 * t, over=VGroup(slide))
        self.play(mover.animate.shift(DOWN * 2.0 * R.scale), run_time=0.13 * t, rate_func=smooth)
        self.st.put(run=0.05 * t, over2=VGroup(end))

    # ------------------------------------------------------------ square: the line bends, polar explains
    def beat_square(self, t):
        zin = lambda s: complex(2, -2.4 + 4.8 * s)
        zout = lambda s: zin(s) ** 2
        L = Plane(LEFT_C, focus=0.8, scale=1.0)
        R = Plane(RIGHT_C, focus=0.0, scale=0.25)
        ts = np.linspace(0, 1, 241)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        a, b = plane_titles()
        focus = VGroup(Circle(radius=0.1, stroke_color=INK, stroke_width=3).move_to(R.pt(0)),
                       Text("focus 0", font_size=22, color=INK).move_to(R.pt(0) + np.array([-0.05, -0.38, 0])))
        lab_in = MathTex(r"x = 2", font_size=34, color=INPUT).move_to(L.pt(complex(2.7, 2.1)))
        lab_out = MathTex(r"u = 4 - v^2/16", font_size=34, color=OUTPUT).move_to(R.pt(0) + np.array([1.55, 2.1, 0]))
        data_l = VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT))
        data_r = VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT), end_tip(R, zout, OUTPUT))
        foot = VGroup(MathTex(r"w = z^2", font_size=40, color=INK).move_to([LEFT_C[0], Y_FOOT, 0]), clock_bar(clock))
        self.st.cut(head=headline("z squared: a line bends", "x = 2 becomes a parabola"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b), data_l=data_l, data_r=data_r, lab=VGroup(lab_in, lab_out),
                    mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw), focus=focus, foot=foot)
        self.play(clock.animate.set_value(1.0), run_time=0.38 * t, rate_func=linear)
        # the polar act: a ray and a circle, r -> r^2 and theta -> 2 theta
        theta = ValueTracker(math.radians(20))
        r_in, r_out = 2.5, 6.25
        ray_z = always_redraw(lambda: Line(L.pt(0), L.pt(r_in * cmath.exp(1j * theta.get_value())), color=POLAR, stroke_width=5))
        ray_w = always_redraw(lambda: Line(R.pt(0), R.pt(r_out * cmath.exp(2j * theta.get_value())), color=POLAR, stroke_width=5))
        arc_z = always_redraw(lambda: Arc(radius=0.9, start_angle=0, angle=theta.get_value(), color=POLAR, stroke_width=4).move_arc_center_to(L.pt(0)))
        arc_w = always_redraw(lambda: Arc(radius=0.9, start_angle=0, angle=2 * theta.get_value(), color=POLAR, stroke_width=4).move_arc_center_to(R.pt(0)))
        circ_z = Arc(radius=r_in * L.scale, start_angle=-0.2, angle=1.9, color=POLAR, stroke_width=3, stroke_opacity=0.7).move_arc_center_to(L.pt(0))
        circ_w = Circle(radius=r_out * R.scale, color=POLAR, stroke_width=3, stroke_opacity=0.7).move_to(R.pt(0))
        dz = always_redraw(lambda: Dot(L.pt(r_in * cmath.exp(1j * theta.get_value())), radius=0.1, color=POLAR))
        dw = always_redraw(lambda: Dot(R.pt(r_out * cmath.exp(2j * theta.get_value())), radius=0.1, color=POLAR))
        th = always_redraw(lambda: Text(f"\u03b8 = Arg z = {math.degrees(theta.get_value()):.0f}\u00b0", font_size=28, color=POLAR).move_to([LEFT_C[0], Y_FOOT, 0]))
        tw = always_redraw(lambda: Text(f"2\u03b8 = Arg w = {2 * math.degrees(theta.get_value()):.0f}\u00b0", font_size=28, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0]))
        rr = VGroup(MathTex(r"r = 2.5", font_size=30, color=POLAR).move_to(L.pt(complex(1.6, -2.0))),
                    MathTex(r"r^2 = 6.25", font_size=30, color=POLAR).move_to(R.pt(complex(0, -7.9))))
        self.st.freeze("cur")
        self.st.put(run=0.06 * t, cur=None, mid=None, lab=None, foot=VGroup(th, tw), polar=VGroup(ray_z, ray_w, arc_z, arc_w, circ_z, circ_w, dz, dw, rr))
        self.play(data_l.animate.set_opacity(0.2), data_r.animate.set_opacity(0.2), run_time=0.04 * t)
        self.play(theta.animate.set_value(math.radians(42)), run_time=0.3 * t, rate_func=smooth)
        self.play(data_l.animate.set_opacity(1.0), data_r.animate.set_opacity(1.0), run_time=0.06 * t)

    # ------------------------------------------------------------ recip: a circle opens into a line
    def beat_recip(self, t):
        zin = lambda s: (lambda th: 2 * math.cos(th) * cmath.exp(1j * th))(-PI / 2 + PI * s)
        zout = lambda s: 1 / zin(s)
        L = Plane(LEFT_C, focus=1.0, scale=1.3)
        R = Plane(RIGHT_C, focus=0.5, scale=1.3)
        ts = np.linspace(0.004, 0.996, 301)
        marks = (0.1, 0.25, 0.5, 0.75, 0.9)
        clock = ValueTracker(0.05)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock, clamp=BOX_H / 2 - 0.12)
        a, b = plane_titles()
        zero = VGroup(Circle(radius=0.11, stroke_color=INK, stroke_width=3).move_to(L.pt(0)),
                      Text("0", font_size=24, color=INK).move_to(L.pt(0) + np.array([-0.3, -0.05, 0])))
        up = VGroup(Arrow(R.pt(complex(0.5, 1.62)), R.pt(complex(0.5, 1.95)), buff=0, color=OUTPUT, stroke_width=5, max_tip_length_to_length_ratio=0.8),
                    Text("to infinity", font_size=22, color=OUTPUT).move_to(R.pt(complex(1.35, 1.55))))
        dn = VGroup(Arrow(R.pt(complex(0.5, -1.62)), R.pt(complex(0.5, -1.95)), buff=0, color=OUTPUT, stroke_width=5, max_tip_length_to_length_ratio=0.8),
                    Text("to infinity", font_size=22, color=OUTPUT).move_to(R.pt(complex(1.35, -1.55))))
        lab_in = MathTex(r"|z - 1| = 1", font_size=34, color=INPUT).move_to(L.pt(complex(2.45, 1.7)))
        lab_out = MathTex(r"\mathrm{Re}\,w = \tfrac12", font_size=34, color=OUTPUT).move_to(R.pt(complex(1.95, 0.0)))

        def readout():
            z = zin(clock.get_value())
            r, ang = abs(z), math.degrees(cmath.phase(z))
            minus = lambda x: f"{x:.0f}".replace("-", "\u2212")                    # a real minus sign, as in the tick labels
            return VGroup(Text(f"r = |z| = {r:.2f}   \u2192   1/r = {1 / r:.2f}", font_size=24, color=POLAR),
                          Text(f"\u03b8 = Arg z = {minus(ang)}\u00b0   \u2192   \u2212\u03b8 = {minus(-ang)}\u00b0", font_size=24, color=POLAR)
                          ).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to([LEFT_C[0] - 0.2, Y_FOOT, 0])
        self.st.cut(head=headline("1/z: a circle opens into a line", "zero goes to infinity"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT, marks), zero),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT, marks), up, dn),
                    lab=VGroup(lab_in, lab_out), mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw), foot=VGroup(always_redraw(readout), clock_bar(clock)))
        self.play(clock.animate.set_value(0.95), run_time=0.8 * t, rate_func=linear)

    # ------------------------------------------------------------ paper: parametrize, push forward, eliminate
    def beat_paper(self, t):
        zin = lambda s: complex(2, -1.7 + 3.4 * s)
        zout = lambda s: zin(s) ** 2
        PL, PR, box = (-3.75, 0.9), (3.75, 0.9), (6.2, 3.6)
        L = Plane(PL, focus=0.8, scale=1.0, box=box)
        R = Plane(PR, focus=0.0, scale=0.25, box=box)
        ts = np.linspace(0, 1, 201)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        titles = VGroup(MathTex(r"z = x + iy", font_size=32, color=INK).move_to([PL[0], 2.88, 0]),
                        MathTex(r"w = u + iv", font_size=32, color=INK).move_to([PR[0], 2.88, 0]))
        specs = [("1  Parametrize", [(r"z = 2 + iy", CART, 34), (r"z(t) = a + t(b - a)", MUTED, 26)]),
                 ("2  Push forward", [(r"u = 4 - y^2", CART, 34), (r"v = 4y", CART, 34)]),
                 ("3  Eliminate y", [(r"y = v/4", CART, 32), (r"u = 4 - v^2/16", CART, 32)])]
        cards = VGroup()
        for i, (title, lines) in enumerate(specs):
            box_ = Rectangle(width=4.35, height=2.3, stroke_color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=0.8)
            head = Text(title, font_size=26, color=INK).move_to(box_.get_top() + np.array([0, -0.33, 0]))
            ms = VGroup(*[MathTex(s, font_size=fs, color=c) for s, c, fs in lines]).arrange(DOWN, buff=0.2).next_to(head, DOWN, buff=0.28)
            cards.add(VGroup(box_, head, ms).move_to([-4.7 + 4.7 * i, -2.5, 0]))
        ring = lambda i: SurroundingRectangle(cards[i], color=POLAR, buff=0.04, stroke_width=4)
        self.st.cut(head=headline("On paper: three steps", "parametrize, push forward, eliminate"),
                    left=VGroup(L.axes(), titles[0]), right=VGroup(R.axes(), titles[1]),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT)),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT),
                                  Circle(radius=0.1, stroke_color=INK, stroke_width=3).move_to(R.pt(0))),
                    cur=VGroup(cz, cw), cards=cards, ring=VGroup(ring(0)))
        self.wait(0.27 * t)
        self.st.put(run=0.06 * t, ring=VGroup(ring(1)))
        self.play(clock.animate.set_value(1.0), run_time=0.15 * t, rate_func=linear)
        self.st.put(run=0.06 * t, ring=VGroup(ring(2)))
        self.wait(0.25 * t)
        self.st.put(run=0.06 * t, ring=VGroup(ring(0), ring(1), ring(2)))
```

### Appendix B. `videos/scenes/zoom-cr.py`

```python
"""zoom-cr: the microscope, the direction circle, no mirror. Reference prototype of docs/designs/iter-2/i2-videos-ch2.md."""
import cmath
import math
import os

import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, T0, T1, WARN, OK, mix, ramp

ARROW_W = 0.5        # direction arrows: (1 - w) * base + w * ramp(phi mod pi) so INPUT green and OUTPUT pink stay readable
DOT_W = 0.7
BOX_W, BOX_H = 6.2, 5.2
LEFT_C, RIGHT_C = (-3.75, -0.2), (3.75, -0.2)
Y_TITLE, Y_FOOT = 2.72, -3.45
Z0 = complex(0.5, 0.5)            # the point under the microscope
ZOOM = 20.0                       # screen units per unit in the microscope panels
RING_R = 1.0                      # screen radius of the ring of directions
RHO = RING_R / ZOOM               # 0.05
LIMIT_RHO = 1e-3                  # the difference quotients drawn as dots use this rho: the limit, so opposite directions coincide
N_DIR = 24
PHIS = [2 * math.pi * k / N_DIR for k in range(N_DIR)]


# ---------------------------------------------------------------- the maths (A = move part, B = mirror part)
def f_zz(z):                       # z^2 + z   (3.1.1): A = 2z + 1, B = 0
    return z * z + z


def f_conj(z):                     # conj z: A = 0, B = 1
    return np.conj(z) if isinstance(z, np.ndarray) else complex(z).conjugate()


def f_abs2(z):                     # |z|^2 (3.1.2): A = conj z0, B = z0
    return (np.abs(z) ** 2).astype(complex) if isinstance(z, np.ndarray) else complex(abs(z) ** 2)


def f_re(z):                       # Re z (P6): A = B = 1/2
    return np.real(z).astype(complex) if isinstance(z, np.ndarray) else complex(z.real)


def AB(f, z0, h=1e-6):
    """A = (f_x - i f_y)/2, B = (f_x + i f_y)/2 from the two partials of f at z0."""
    fx = (f(z0 + h) - f(z0 - h)) / (2 * h)
    fy = (f(z0 + 1j * h) - f(z0 - 1j * h)) / (2 * h)
    return (fx - 1j * fy) / 2, (fx + 1j * fy) / 2


def quotient(f, z0, rho, phi):
    """(f(z0 + rho e^{i phi}) - f(z0)) / (rho e^{i phi}); tends to A + B e^{-2 i phi} as rho -> 0."""
    h = rho * cmath.exp(1j * phi)
    return (f(z0 + h) - f(z0)) / h


def check_numbers():
    for z0 in (Z0, 1.2 + 0.9j, -0.3 + 0.8j):
        A, B = AB(f_conj, z0); assert abs(A) < 1e-6 and abs(B - 1) < 1e-6
        A, B = AB(f_zz, z0); assert abs(A - (2 * z0 + 1)) < 1e-6 and abs(B) < 1e-6
        A, B = AB(f_abs2, z0); assert abs(A - z0.conjugate()) < 1e-6 and abs(B - z0) < 1e-6
        A, B = AB(f_re, z0); assert abs(A - 0.5) < 1e-6 and abs(B - 0.5) < 1e-6
        for phi in PHIS:
            for f in (f_conj, f_zz, f_abs2, f_re):
                A, B = AB(f, z0)
                assert abs(quotient(f, z0, 1e-6, phi) - (A + B * cmath.exp(-2j * phi))) < 1e-4
    x, y = Z0.real, Z0.imag                                            # Jacobian of z^2 + z at Z0 = [[2, -1], [1, 2]]
    assert (2 * x + 1, -2 * y, 2 * y, 2 * x + 1) == (2.0, -1.0, 1.0, 2.0)
    assert abs(f_zz(Z0) - complex(0.5, 1.0)) < 1e-12
    assert abs(abs(2 * Z0 + 1) - math.sqrt(5)) < 1e-12 and abs(math.degrees(cmath.phase(2 * Z0 + 1)) - 26.565051177) < 1e-6


# ---------------------------------------------------------------- planes and helpers
class Plane:
    def __init__(self, centre, focus=0j, scale=1.0, box=(BOX_W, BOX_H)):
        self.cx, self.cy = centre
        self.focus = complex(focus)
        self.scale = scale
        self.w, self.h = box

    def pt(self, z):
        z = complex(z)
        return np.array([self.cx + (z.real - self.focus.real) * self.scale, self.cy + (z.imag - self.focus.imag) * self.scale, 0.0])

    def pts(self, zs):
        zs = np.asarray(zs, dtype=complex)
        return np.stack([self.cx + (zs.real - self.focus.real) * self.scale, self.cy + (zs.imag - self.focus.imag) * self.scale, np.zeros(zs.shape)], axis=-1)

    def frame(self):
        return Rectangle(width=self.w, height=self.h, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.8,
                         fill_color=SURFACE, fill_opacity=0.55).move_to([self.cx, self.cy, 0])

    def axes(self):
        g = VGroup(self.frame())
        hx, hy = self.w / 2 / self.scale, self.h / 2 / self.scale
        x0, x1 = self.focus.real - hx, self.focus.real + hx
        y0, y1 = self.focus.imag - hy, self.focus.imag + hy
        s = next((s for s in (1, 2, 5, 10, 20) if s * self.scale >= 0.85), 50)
        for k in range(math.ceil(x0 / s), math.floor(x1 / s) + 1):
            x = k * s
            p = self.pt(complex(x, y0))
            if x != 0 and abs(p[0] - self.cx) < self.w / 2 - 0.35:
                g.add(Line(self.pt(complex(x, y0)), self.pt(complex(x, y1)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(str(x).replace("-", "\u2212"), font_size=18, color=MUTED).move_to(p + np.array([0, 0.17, 0])))
        for k in range(math.ceil(y0 / s), math.floor(y1 / s) + 1):
            y = k * s
            p = self.pt(complex(x0, y))
            if y != 0 and abs(p[1] - self.cy) < self.h / 2 - 0.35:
                g.add(Line(self.pt(complex(x0, y)), self.pt(complex(x1, y)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(f"{y}i".replace("-", "\u2212"), font_size=18, color=MUTED).move_to(p + np.array([0.27, 0, 0])))
        if x0 < 0 < x1:
            g.add(Line(self.pt(complex(0, y0)), self.pt(complex(0, y1)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        if y0 < 0 < y1:
            g.add(Line(self.pt(complex(x0, 0)), self.pt(complex(x1, 0)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        return g


def runs(P, plane, pad=0.03):
    """Split an (n, 3) array of screen points into the runs that stay inside the plane's box."""
    ok = (np.abs(P[:, 0] - plane.cx) <= plane.w / 2 - pad) & (np.abs(P[:, 1] - plane.cy) <= plane.h / 2 - pad) & np.isfinite(P).all(axis=1)
    out, cur = [], []
    for p, o in zip(P, ok):
        if o:
            cur.append(p)
        elif cur:
            out.append(np.array(cur)); cur = []
    if cur:
        out.append(np.array(cur))
    return [r for r in out if len(r) >= 2]


def polyline(P, color, width=3, opacity=1.0):
    m = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity, fill_opacity=0)
    m.set_points_as_corners(P)
    return m


def grid_image(plane, f, z0, zoom, n=3, opacity=0.8, samples=161, faint=False):
    """Image under f of the lines Re z = x0 + j/zoom and Im z = y0 + j/zoom (j = -n..n), clipped to the plane's box."""
    d = 1.0 / zoom
    s = np.linspace(-3.6 * d, 3.6 * d, samples)
    g = VGroup()
    for j in range(-n, n + 1):
        wid, op = (4, opacity) if (j == 0 and not faint) else (2.2 if not faint else 1.2, opacity * (0.7 if not faint else 0.3))
        for z in (complex(z0.real + j * d, z0.imag) + 1j * s, complex(z0.real, z0.imag + j * d) + s):
            for r in runs(plane.pts(f(z)), plane):
                g.add(polyline(r, CART, wid, op))
    return g


def ramp_dir(base, phi, w=ARROW_W):
    """A direction is a line through z0: phi and phi + pi get the same shade (the quotient cannot tell them apart)."""
    return ramp(base, (phi % math.pi) / math.pi, w)


def live_number(tex, fn, pos, decimals=2, font_size=36, color=INK):
    """A MathTex label (compiled once) followed by a DecimalNumber that tracks fn(); no LaTeX is run per frame."""
    label = MathTex(tex, font_size=font_size, color=color)
    num = DecimalNumber(fn(), num_decimal_places=decimals, font_size=font_size, color=color)
    num.add_updater(lambda m: m.set_value(fn()))
    return VGroup(label, num).arrange(RIGHT, buff=0.15).move_to(pos)


def headline(main, sub=None):
    g = VGroup(Text(main, font_size=34, color=INK).move_to([-6.85, 3.55, 0], aligned_edge=LEFT))
    if sub:
        g.add(Text(sub, font_size=24, color=MUTED).move_to([6.85, 3.5, 0], aligned_edge=RIGHT))
    return g


def two_columns(cart_tex, polar_tex, y=-3.42):
    c = VGroup(Text("Cartesian", font_size=26, color=CART), MathTex(cart_tex, font_size=34, color=CART)).arrange(DOWN, buff=0.12).move_to([LEFT_C[0], y, 0])
    p = VGroup(Text("polar", font_size=26, color=POLAR), MathTex(polar_tex, font_size=34, color=POLAR)).arrange(DOWN, buff=0.12).move_to([RIGHT_C[0], y, 0])
    return c, p


SLOT_Z = {"left": 0, "right": 0, "lx": 2, "rx": 2, "over": 5, "head": 6, "foot": 6, "foot2": 6}


class Stage:
    """Named slots; put(slot=group, ...) fades each slot's old group out and its new group in together, in one play."""

    def __init__(self, scene):
        self.scene = scene
        self.slots = {}

    def put(self, run=0.3, **kw):
        anims = []
        for name, new in kw.items():
            old = self.slots.get(name)
            if old is not None:
                for m in old.get_family():
                    m.clear_updaters()
                anims.append(FadeOut(old))
            if new is not None:
                new.set_z_index(SLOT_Z.get(name, 2))
                anims.append(FadeIn(new))
            self.slots[name] = new
        if anims:
            self.scene.play(*anims, run_time=run)


    def place(self, **kw):
        """Put groups on the stage at once, with no transition. Only the first beat of a film uses it, so that frame 0 is the intro card:
        the poster frame a browser shows before the student presses play."""
        for name, new in kw.items():
            new.set_z_index(SLOT_Z.get(name, 2))
            self.scene.add(new)
            self.slots[name] = new

    def cut(self, run=0.3, **kw):
        names = set(self.slots) | set(kw)
        self.put(run=run, **{n: kw.get(n) for n in names})


class Main(NarratedScene):
    narration_id = "zoom-cr"

    def setup(self):
        super().setup()
        self.camera.background_color = BG
        self.st = Stage(self)
        self.only = {s for s in os.environ.get("BEATS", "").split(",") if s}

    def on(self, beat_id):
        return not self.only or beat_id in self.only

    def construct(self):
        check_numbers()
        if self.on("intro"):
            with self.beat("intro") as t:
                self.beat_intro(t)
        if self.on("ring"):
            with self.beat("ring") as t:
                self.beat_ring(t)
        if self.on("move"):
            with self.beat("move") as t:
                self.beat_move(t)
        if self.on("quotient"):
            with self.beat("quotient") as t:
                self.beat_quotient(t)
        if self.on("mirror"):
            with self.beat("mirror") as t:
                self.beat_mirror(t)
        if self.on("cr"):
            with self.beat("cr") as t:
                self.beat_cr(t)
        if self.on("abs2"):
            with self.beat("abs2") as t:
                self.beat_abs2(t)

    # ------------------------------------------------------------ the two microscope panels (shared by ring, move, quotient)
    def micro_left(self):
        L = Plane(LEFT_C, focus=Z0, scale=ZOOM)
        d = 1.0 / ZOOM
        hv, hh = (BOX_H / 2 - 0.02) / ZOOM, (BOX_W / 2 - 0.02) / ZOOM
        grid = VGroup()
        for j in range(-3, 4):
            grid.add(Line(L.pt(Z0 + complex(j * d, -hv)), L.pt(Z0 + complex(j * d, hv)), stroke_color=CART, stroke_width=1.2, stroke_opacity=0.25))
            if abs(j) <= 2:
                grid.add(Line(L.pt(Z0 + complex(-hh, j * d)), L.pt(Z0 + complex(hh, j * d)), stroke_color=CART, stroke_width=1.2, stroke_opacity=0.25))
        ring = Circle(radius=RING_R, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.5).move_to(L.pt(Z0))
        arrows = VGroup(*[Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * p)), buff=0, color=ramp_dir(INPUT, p), stroke_width=3.5,
                                tip_length=0.16, max_tip_length_to_length_ratio=0.35) for p in PHIS])
        lab_pos = L.pt(Z0) + np.array([-1.7, -1.25, 0])
        lead = Line(L.pt(Z0) + np.array([-0.08, -0.08, 0]), lab_pos + np.array([0.3, 0.17, 0]), stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.7)
        lab = MathTex(r"z_0", font_size=34, color=INK).move_to(lab_pos)
        title = MathTex(r"z = z_0 + \Delta z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0])
        zoom = Text(f"zoom \u00d7{ZOOM:.0f}", font_size=22, color=MUTED).move_to([LEFT_C[0] + 2.2, -2.4, 0])
        return L, VGroup(L.frame(), grid, ring, arrows, lead, Dot(L.pt(Z0), radius=0.09, color=INK), lab, title, zoom)

    def micro_right(self, f=f_zz):
        W0 = f(Z0)
        R = Plane(RIGHT_C, focus=W0, scale=ZOOM)
        d = 1.0 / ZOOM
        grid = grid_image(R, f, Z0, ZOOM, samples=81, faint=True)
        tips = [f(Z0 + RHO * cmath.exp(1j * p)) for p in PHIS]
        arrows = VGroup(*[Arrow(R.pt(W0), R.pt(w), buff=0, color=ramp_dir(OUTPUT, p), stroke_width=3.5, tip_length=0.16, max_tip_length_to_length_ratio=0.35)
                          for p, w in zip(PHIS, tips)])
        closed = polyline(R.pts(np.array([f(Z0 + RHO * cmath.exp(1j * q)) for q in np.linspace(0, 2 * math.pi, 121)])), OUTPUT, 1.5, 0.5)
        lab_pos = R.pt(W0) + np.array([-2.35, -2.0, 0])
        lead = Line(R.pt(W0) + np.array([-0.08, -0.08, 0]), lab_pos + np.array([0.5, 0.2, 0]), stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.7)
        lab = MathTex(r"f(z_0)", font_size=34, color=INK).move_to(lab_pos)
        title = MathTex(r"w = f(z_0 + \Delta z)", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        return R, VGroup(R.frame(), grid, closed, arrows, lead, Dot(R.pt(W0), radius=0.09, color=INK), lab, title)

    # ------------------------------------------------------------ intro: the zoom
    def beat_intro(self, t):
        k = ValueTracker(0.0)                      # log10 of the zoom
        W0 = f_zz(Z0)
        L = lambda: Plane(LEFT_C, focus=Z0, scale=10 ** k.get_value())
        R = lambda: Plane(RIGHT_C, focus=W0, scale=10 ** k.get_value())
        left = always_redraw(lambda: grid_image(L(), lambda z: z, Z0, 10 ** k.get_value()))
        right = always_redraw(lambda: grid_image(R(), f_zz, Z0, 10 ** k.get_value()))
        l_dot = VGroup(Dot(L().pt(Z0), radius=0.1, color=INK), MathTex(r"z_0", font_size=34, color=INK).move_to(L().pt(Z0) + np.array([-0.32, -0.3, 0])))
        r_dot = VGroup(Dot(R().pt(W0), radius=0.1, color=INK), MathTex(r"f(z_0)", font_size=34, color=INK).move_to(R().pt(W0) + np.array([-0.5, -0.32, 0])))
        z_read = always_redraw(lambda: Text(f"zoom \u00d7{10 ** k.get_value():.0f}", font_size=30, color=INK).move_to([0, Y_FOOT, 0]))
        foot = MathTex(r"f(z) = z^2 + z", font_size=38, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])
        self.st.place(head=headline("Zoom in", "up close, the bending goes away"),
                    left=VGroup(L().frame(), left, l_dot, MathTex(r"z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0])),
                    right=VGroup(R().frame(), right, r_dot, MathTex(r"w = f(z)", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])),
                    foot=VGroup(foot, z_read))
        self.play(k.animate.set_value(math.log10(ZOOM)), run_time=0.6 * t, rate_func=smooth)
        self.st.put(run=0.1 * t, rx=VGroup(Text("turned and stretched", font_size=28, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0])))

    # ------------------------------------------------------------ ring: where does f send each step?
    def beat_ring(self, t):
        L, lg = self.micro_left()
        R, rg = self.micro_right()
        phi = ValueTracker(0.0)
        hl = always_redraw(lambda: Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22))
        hr = always_redraw(lambda: Arrow(R.pt(f_zz(Z0)), R.pt(f_zz(Z0 + RHO * cmath.exp(1j * phi.get_value()))), buff=0, color=INK, stroke_width=8, tip_length=0.22))
        arc = always_redraw(lambda: Arc(radius=0.55, start_angle=0, angle=max(phi.get_value(), 1e-3), color=POLAR, stroke_width=4).move_arc_center_to(L.pt(Z0)))
        foot = VGroup(MathTex(r"\Delta z = ", r"\rho\, e^{i\varphi}", r"\qquad \varphi \in \arg \Delta z", font_size=38, color=INK))
        foot[0][1].set_color(POLAR); foot[0][2].set_color(MUTED)
        foot.move_to([LEFT_C[0] + 1.0, Y_FOOT, 0])
        self.st.put(head=headline("A ring of directions", "where does f send each step?"),
                    left=lg, right=rg, lx=VGroup(hl, arc), rx=VGroup(hr), foot=foot)
        self.play(phi.animate.set_value(2 * math.pi), run_time=0.6 * t, rate_func=linear)

    # ------------------------------------------------------------ move: one turn, one stretch
    def beat_move(self, t):
        fprime = 2 * Z0 + 1
        W0 = f_zz(Z0)
        L, R = Plane(LEFT_C, focus=Z0, scale=ZOOM), Plane(RIGHT_C, focus=W0, scale=ZOOM)
        e_in = VGroup(Arrow(L.pt(Z0), L.pt(Z0 + RHO), buff=0, color=INK, stroke_width=8, tip_length=0.22),
                      MathTex(r"\rho", font_size=32, color=INK).move_to(L.pt(Z0) + np.array([0.55, 0.3, 0])))
        e_out = Arrow(R.pt(W0), R.pt(f_zz(Z0 + RHO)), buff=0, color=INK, stroke_width=8, tip_length=0.22)
        base = DashedLine(R.pt(W0), R.pt(W0) + np.array([2.4, 0, 0]), color=POLAR, stroke_width=2.5)
        turn = Arc(radius=1.0, start_angle=0, angle=cmath.phase(fprime), color=POLAR, stroke_width=5).move_arc_center_to(R.pt(W0))
        turn_lab = MathTex(r"\mathrm{Arg}\,f' = 26.6^\circ", font_size=32, color=POLAR).move_to(R.pt(W0) + np.array([1.5, -0.4, 0]))
        stretch_lab = MathTex(r"|f'|\,\rho = \sqrt5\,\rho", font_size=32, color=POLAR).move_to(R.pt(W0) + np.array([-1.95, 2.25, 0]))
        cart, pol = two_columns(r"f'(z_0) = u_x + i\,v_x = 2 + i", r"f'(z_0) = \sqrt5\, e^{i\,26.6^\circ}")
        self.st.put(head=headline("One move up close", "multiply by f prime of z0"),
                    lx=VGroup(e_in), rx=VGroup(e_out, base, turn, turn_lab, stretch_lab), foot=None, foot2=None)
        self.wait(0.1 * t)
        self.play(Indicate(turn, color=POLAR, scale_factor=1.05), run_time=0.1 * t)
        self.wait(0.43 * t)
        self.st.put(run=0.05 * t, foot=VGroup(cart))
        self.wait(0.15 * t)
        self.st.put(run=0.05 * t, foot2=VGroup(pol))

    # ------------------------------------------------------------ quotient: one dot per direction, a circle
    def beat_quotient(self, t):
        A, B = AB(f_abs2, Z0)                     # A = conj z0 = 0.5 - 0.5i, B = z0
        Q = Plane(RIGHT_C, focus=complex(0.5, -0.5), scale=2.6)
        L = Plane(LEFT_C, focus=Z0, scale=ZOOM)
        phi = ValueTracker(0.0)
        dots = VGroup(*[Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
        circle = DashedVMobject(Circle(radius=abs(B) * Q.scale, stroke_color=POLAR, stroke_width=3).move_to(Q.pt(A)), num_dashes=48)
        centre = VGroup(Dot(Q.pt(A), radius=0.07, color=POLAR), MathTex(r"A", font_size=36, color=POLAR).move_to(Q.pt(A) + np.array([0.0, -0.34, 0])))
        rad = VGroup(Line(Q.pt(A), Q.pt(A + abs(B)), color=WARN, stroke_width=4), MathTex(r"|B|", font_size=32, color=WARN).move_to(Q.pt(A + abs(B) * 0.5) + np.array([0, 0.3, 0])))
        hl = always_redraw(lambda: VGroup(Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22),
                                          Arrow(L.pt(Z0), L.pt(Z0 - RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22)))
        hd = always_redraw(lambda: Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, phi.get_value())), radius=0.15, color=INK))
        title = MathTex(r"\Delta w / \Delta z", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        foot = MathTex(r"\frac{\Delta w}{\Delta z} \to ", "A", "+", "B", r"e^{-2i\varphi}", font_size=40, color=INK)
        foot[1].set_color(POLAR); foot[3].set_color(WARN); foot[4].set_color(POLAR)
        foot.move_to([RIGHT_C[0], Y_FOOT, 0])
        note = Text("opposite arrows, same dot", font_size=24, color=MUTED).move_to([LEFT_C[0], Y_FOOT, 0])
        self.st.put(head=headline("One dot per direction", "the dots trace a circle"),
                    right=VGroup(Q.axes(), title), lx=VGroup(hl), rx=VGroup(circle, dots, centre, rad, hd), foot=VGroup(foot, note), foot2=None)
        self.play(phi.animate.set_value(2 * math.pi), run_time=0.6 * t, rate_func=linear)

    # ------------------------------------------------------------ mirror: conj never shrinks, z^2 + z does
    def beat_mirror(self, t):
        rho = ValueTracker(0.1)
        A0 = 2 * Z0 + 1
        QL, QR = Plane(LEFT_C, focus=0.25, scale=2.0), Plane(RIGHT_C, focus=A0, scale=2.0)
        title_r = MathTex(r"z^2 + z:\ A = 2z + 1,\ B = 0", font_size=34, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])

        def conj_panel():
            dots = VGroup(*[Dot(QL.pt(quotient(f_conj, Z0, 0.1, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
            circle = DashedVMobject(Circle(radius=2.0, stroke_color=POLAR, stroke_width=3).move_to(QL.pt(0)), num_dashes=48)
            rad = VGroup(Line(QL.pt(0), QL.pt(1), color=WARN, stroke_width=4), MathTex(r"|B| = 1", font_size=32, color=WARN).move_to(QL.pt(0.5) + np.array([0, 0.3, 0])))
            return VGroup(circle, dots, rad, Text("never shrinks", font_size=26, color=WARN).move_to([LEFT_C[0], Y_FOOT, 0]),
                          MathTex(r"\bar z:\ A = 0,\ B = 1", font_size=34, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]))

        def re_panel():
            dots = VGroup(*[Dot(QL.pt(quotient(f_re, Z0, 0.1, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
            circle = DashedVMobject(Circle(radius=1.0, stroke_color=POLAR, stroke_width=3).move_to(QL.pt(0.5)), num_dashes=40)
            rad = VGroup(Line(QL.pt(0.5), QL.pt(1.0), color=WARN, stroke_width=4), MathTex(r"|B| = \tfrac12", font_size=32, color=WARN).move_to(QL.pt(complex(0.5, 0.74))))
            return VGroup(circle, dots, rad, Text("Re z: never shrinks either", font_size=26, color=WARN).move_to([LEFT_C[0], Y_FOOT, 0]),
                          MathTex(r"\mathrm{Re}\,z:\ A = \tfrac12,\ B = \tfrac12", font_size=34, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]))

        dr = always_redraw(lambda: VGroup(*[Dot(QR.pt(quotient(f_zz, Z0, rho.get_value(), p)), radius=0.07, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=1.5) for p in PHIS]))
        cr_ = always_redraw(lambda: Circle(radius=max(rho.get_value() * QR.scale, 0.02), stroke_color=POLAR, stroke_width=2.5).move_to(QR.pt(A0)))
        point = VGroup(Dot(QR.pt(A0), radius=0.06, color=OK), MathTex(r"f' = 2z + 1", font_size=34, color=OK).move_to(QR.pt(A0) + np.array([0.0, 0.62, 0])))
        read = always_redraw(lambda: Text(f"\u03c1 = {rho.get_value():.2f}", font_size=30, color=INK).move_to([RIGHT_C[0], Y_FOOT, 0]))
        self.st.put(head=headline("B is the mirror part", "no mirror, no circle"),
                    left=VGroup(QL.axes()), right=VGroup(QR.axes(), title_r), lx=conj_panel(), rx=VGroup(cr_, dr, point),
                    foot=VGroup(read), foot2=None)
        self.play(rho.animate.set_value(0.06), run_time=0.4 * t, rate_func=linear)
        self.st.put(run=0.1 * t, lx=re_panel())
        self.play(rho.animate.set_value(0.02), run_time=0.4 * t, rate_func=linear)

    # ------------------------------------------------------------ cr: no mirror, the matrix is a move
    def beat_cr(self, t):
        eqs = VGroup(MathTex(r"u_x = v_y", font_size=60, color=CART), MathTex(r"u_y = -v_x", font_size=60, color=CART)).arrange(DOWN, buff=0.4)
        no_mirror = Text("no mirror part", font_size=30, color=OK)
        mat = MathTex(r"\begin{pmatrix} u_x & u_y \\ v_x & v_y \end{pmatrix} = \begin{pmatrix} a & -b \\ b & a \end{pmatrix}", font_size=44, color=CART)
        left = VGroup(eqs, no_mirror, mat).arrange(DOWN, buff=0.45).move_to([LEFT_C[0], -0.15, 0])
        P = Plane(RIGHT_C, focus=complex(0.4, 1.4), scale=1.15)
        s = ValueTracker(0.0)
        sq = [0j, 1 + 0j, 1 + 1j, 0 + 1j]
        J = lambda z: complex(2 * z.real - 1 * z.imag, 1 * z.real + 2 * z.imag)        # [[2, -1], [1, 2]] = [[a, -b], [b, a]] with a = 2, b = 1
        start = VGroup(*[Line(P.pt(sq[i]), P.pt(sq[(i + 1) % 4]), color=INPUT, stroke_width=4) for i in range(4)])
        img = always_redraw(lambda: Polygon(*[P.pt((1 - s.get_value()) * z + s.get_value() * J(z)) for z in sq], color=OUTPUT, stroke_width=5, fill_color=OUTPUT, fill_opacity=0.18))
        arc = always_redraw(lambda: Arc(radius=0.8, start_angle=0, angle=max(s.get_value() * cmath.phase(2 + 1j), 1e-3), color=POLAR, stroke_width=4).move_arc_center_to(P.pt(0)))
        lab = MathTex(r"a = 2,\ b = 1", font_size=34, color=CART).move_to(P.pt(complex(2.0, -0.35)))
        title = MathTex(r"\text{a tiny square}", font_size=34, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        cart, pol = two_columns(r"f'(z_0) = u_x + i\,v_x = 2 + i", r"f'(z_0) = \sqrt5\, e^{i\,26.6^\circ}")
        self.st.put(head=headline("Cauchy-Riemann", "no mirror: one turn, one stretch"),
                    left=left, lx=None, right=VGroup(P.axes(), title), rx=VGroup(start, img, arc, lab), foot=None, foot2=None)
        self.wait(0.4 * t)
        self.play(s.animate.set_value(1.0), run_time=0.35 * t, rate_func=smooth)
        self.st.put(run=0.05 * t, foot=VGroup(cart))
        self.wait(0.05 * t)
        self.st.put(run=0.05 * t, foot2=VGroup(pol))

    # ------------------------------------------------------------ abs2: |z|^2 is differentiable at one point only
    def beat_abs2(self, t):
        z_start = complex(1.2, 0.9)
        u = ValueTracker(0.0)                                  # 0 at z_start, 1 at 0
        z0 = lambda: z_start * (1 - u.get_value())
        L = Plane(LEFT_C, focus=z_start / 2, scale=1.7)
        Q = Plane(RIGHT_C, focus=z_start.conjugate() / 2, scale=1.25)
        path = DashedLine(L.pt(z_start), L.pt(0), color=MUTED, stroke_width=2)
        zlab = MathTex(r"z_0", font_size=34, color=INK)
        zdot = VGroup(Dot(L.pt(z_start), radius=0.11, color=INK), zlab)
        zdot[0].add_updater(lambda m: m.move_to(L.pt(z0())))
        zlab.add_updater(lambda m: m.move_to(L.pt(z0()) + np.array([0.35, 0.28, 0])))
        zero = VGroup(Circle(radius=0.13, stroke_color=INK, stroke_width=3).move_to(L.pt(0)), Text("0", font_size=24, color=INK).move_to(L.pt(0) + np.array([-0.3, -0.05, 0])))
        circ = always_redraw(lambda: DashedVMobject(Circle(radius=max(abs(z0()) * Q.scale, 0.03), stroke_color=POLAR, stroke_width=3).move_to(Q.pt(z0().conjugate())), num_dashes=48))
        dots = always_redraw(lambda: VGroup(*[Dot(Q.pt(quotient(f_abs2, z0(), LIMIT_RHO, p)), radius=0.075, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=1.5) for p in PHIS]))
        alab = MathTex(r"A = \bar z_0", font_size=32, color=POLAR)
        centre = VGroup(Dot(Q.pt(z_start.conjugate()), radius=0.07, color=POLAR), alab)
        centre[0].add_updater(lambda m: m.move_to(Q.pt(z0().conjugate())))
        alab.add_updater(lambda m: m.move_to(Q.pt(z0().conjugate()) + np.array([0.0, -0.42, 0])))
        read = live_number(r"|B| = |z_0| =", lambda: abs(z0()), [RIGHT_C[0], Y_FOOT, 0], color=WARN)
        self.st.put(head=headline("Absolute value squared", "the circle shrinks to 0"),
                    left=VGroup(L.axes(), MathTex(r"z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]), path, zero),
                    right=VGroup(Q.axes(), MathTex(r"\Delta w / \Delta z", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])),
                    lx=VGroup(zdot), rx=VGroup(circ, dots, centre),
                    foot=VGroup(read, MathTex(r"f(z) = |z|^2", font_size=38, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])), foot2=None)
        self.play(u.animate.set_value(1.0), run_time=0.65 * t, rate_func=linear)
        done = VGroup(Dot(Q.pt(0), radius=0.08, color=OK), MathTex(r"f'(0) = 0", font_size=36, color=OK).move_to(Q.pt(0) + np.array([0.0, 0.6, 0])))
        self.st.put(run=0.1 * t, rx=done)
```

### Appendix C. `media/narration/videos/motion-time.json` and `zoom-cr.json`

```json
{
  "id": "motion-time",
  "title": "A function is a motion with a clock",
  "summary": "A stroke carries a clock and its image keeps it. Linear maps keep lines, the line x = 2 bends into a parabola under z squared, and the circle |z - 1| = 1 opens into the line Re w = 1/2 under 1/z. On paper: parametrize, push forward, eliminate.",
  "station": "mappings",
  "music": {
    "prompt": "Calm, curious ambient piano with soft pulsing synth pads, slow tempo, a sense of gentle steady motion, no vocals, loopable",
    "seconds": 30
  },
  "segments": [
    {
      "id": "intro",
      "text": "A function picks up every point of the plane and puts it down somewhere else. On the left is the input, the z-plane. On the right is the output, the w-plane. Every question in this chapter asks one thing: where does this shape land, and why there?"
    },
    {
      "id": "stroke",
      "text": "Now draw a stroke. A stroke is a point moving: z of t, with t running from 0 to 1. Colour it by the clock, dark at the start and light at the end. Push every point through the function, and the image keeps the clock. Same shades, same dots, so when matches where."
    },
    {
      "id": "linear",
      "text": "Linear maps are the simplest motions. The map w equals i z minus 2 i turns the whole plane a quarter turn, then slides it down 2. Lines stay lines. Watch the vertical line x equals 2: it lands flat on the real axis. One turn and one slide, for every point at once."
    },
    {
      "id": "square",
      "text": "Now square it. Push the line x equals 2 forward, with y as the clock, and it bends into a parabola with its focus at 0. Why? In polar, z squared squares the length and doubles the angle, so circles stay circles and rays stay rays. In Cartesian, a straight line is not so lucky."
    },
    {
      "id": "recip",
      "text": "One over z inverts the length and flips the angle. The circle through 0 is z equals 2 cos theta times e to the i theta, so 1 over z is one half minus i over 2 times tan theta. Real part one half: Re w equals one half. Zero goes to infinity, so the circle opens into a line."
    },
    {
      "id": "paper",
      "text": "On paper it is three steps. Parametrize: z equals 2 plus i y, with y as the clock. Push forward: u equals 4 minus y squared, and v equals 4y. Eliminate y: y is v over 4, so u equals 4 minus v squared over 16. Same parabola. Every image question goes parametrize, push forward, eliminate."
    }
  ]
}
```

```json
{
  "id": "zoom-cr",
  "title": "The microscope, the direction circle, and no mirror",
  "summary": "Put a point under a microscope: a ring of directions, one turn and one stretch, the circle of difference quotients with centre A and radius the size of B, no mirror means Cauchy-Riemann, and |z|^2 is differentiable at 0 only.",
  "station": "derivative",
  "music": {
    "prompt": "Quiet, focused ambient texture with a slow rising arpeggio and soft bell tones, a feeling of zooming in, no vocals, loopable",
    "seconds": 30
  },
  "segments": [
    {
      "id": "intro",
      "text": "Put a point under a microscope. Far away, a function bends the plane. Up close, the bending disappears, and the grid comes out straight, only turned and stretched. That is what differentiable will mean: one move, up close."
    },
    {
      "id": "ring",
      "text": "Around the point z zero, draw a tiny ring of directions. Each arrow is a step, delta z, with length rho and angle phi. Now ask where the function sends each step. The ring goes in on the left, and its image comes out on the right."
    },
    {
      "id": "move",
      "text": "If the ring comes out as a ring, turned and stretched by one number, then up close the function is one move: multiplication by f prime of z zero. That number is complex, so it has two addresses. In Cartesian, u sub x plus i v sub x. In polar, a stretch and a turn."
    },
    {
      "id": "quotient",
      "text": "A move treats every direction alike. So divide each image step by its input step. Every direction gives one dot, and as the direction goes round, the dots trace a circle. Its centre A is the move part. Its radius is the size of B, the mirror part. Opposite directions share a dot."
    },
    {
      "id": "mirror",
      "text": "B is the mirror part. Conjugation is pure mirror: its circle has radius 1 and never shrinks, however closely you look. The real part squashes the plane, with radius one half: same story. But z squared plus z has no mirror. Its circle shrinks to a single point, the derivative, 2z plus 1."
    },
    {
      "id": "cr",
      "text": "In x and y, no mirror reads: u sub x equals v sub y, and u sub y equals minus v sub x. That is Cauchy-Riemann. It says the four partials make the matrix a, minus b, b, a: a turn and a stretch, nothing else. Then the derivative is u sub x plus i v sub x."
    },
    {
      "id": "abs2",
      "text": "Now the absolute value of z, squared. Its circle has centre the conjugate of z zero and radius the length of z zero. It shrinks to a point only when z zero reaches 0. So it is differentiable at 0, with derivative 0, and nowhere else. Analytic nowhere."
    }
  ]
}
```

### Appendix D. `tests/unit/i2-videos-ch2.test.mjs`

```js
// tests/unit/i2-videos-ch2.test.mjs
// Goal i2-videos-ch2: the manim explainers motion-time and zoom-cr. Pure checks (narration JSON, the two scene sources, the numbers
// the films state) always run; the checks of the rendered files (A1) run for every video whose media/video/<id>.mp4 exists.
// Design: docs/designs/iter-2/i2-videos-ch2.md section 7.2.   Run: node --test tests/unit/i2-videos-ch2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STATIONS } from '../../js/registry.js';
import * as X from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { C } = X;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearC = (z, w, eps = 1e-9, msg = '') => assert.ok(Math.hypot(z.re - w.re, z.im - w.im) <= eps, `${msg} expected (${w.re}, ${w.im}), got (${z.re}, ${z.im}) (eps ${eps})`);
const deg = (r) => (r * 180) / Math.PI;

const VIDEOS = {
  'motion-time': { station: 'mappings', beats: ['intro', 'stroke', 'linear', 'square', 'recip', 'paper'],
    words: [47, 54, 54, 55, 60, 56], seconds: 132.5 },
  'zoom-cr': { station: 'derivative', beats: ['intro', 'ring', 'move', 'quotient', 'mirror', 'cr', 'abs2'],
    words: [38, 47, 55, 53, 53, 58, 48], seconds: 143.25 },
};
const IDS = Object.keys(VIDEOS);
const narration = (id) => JSON.parse(read(`media/narration/videos/${id}.json`));
const sceneSrc = (id) => read(`videos/scenes/${id}.py`);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const allText = (id) => narration(id).segments.map((s) => s.text).join(' ');

// ================================================================== U1 (A2): the narration files
test('U1 narration JSON: fields, station, music, segments', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.equal(n.id, id);
    assert.ok(typeof n.title === 'string' && n.title.trim().length > 0, `${id} title`);
    assert.ok(typeof n.summary === 'string' && n.summary.length >= 40, `${id} summary >= 40 chars`);
    assert.equal(n.station, VIDEOS[id].station, `${id} station`);
    const owner = STATIONS.find((s) => s.video === id);
    assert.ok(owner, `${id} is the video of a registry station`);
    assert.equal(owner.id, n.station, `${id} station equals the registry station whose video field is ${id}`);
    assert.ok(n.music && typeof n.music.prompt === 'string' && n.music.prompt.length >= 20, `${id} music.prompt >= 20 chars`);
    assert.ok(Number.isFinite(n.music.seconds) && n.music.seconds >= 20 && n.music.seconds <= 40, `${id} music.seconds in 20..40`);
    assert.deepEqual(n.segments.map((s) => s.id), VIDEOS[id].beats, `${id} segment ids in order`);
    assert.equal(new Set(n.segments.map((s) => s.id)).size, n.segments.length, `${id} unique segment ids`);
    for (const s of n.segments) {
      assert.match(s.id, /^[a-z0-9-]+$/, `${id}/${s.id} id shape`);
      const w = words(s.text);
      assert.ok(w >= 12 && w <= 60, `${id}/${s.id}: ${w} words, want 12..60`);
      assert.ok(!/[$\\]/.test(s.text), `${id}/${s.id}: spoken text has no TeX characters`);
    }
    const total = n.segments.reduce((a, s) => a + words(s.text), 0);
    assert.ok(total >= 300 && total <= 450, `${id}: ${total} words in total, want 300..450`);
  }
});

test('U1b narration is frozen at the designed word counts, so the film length is the designed length', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.deepEqual(n.segments.map((s) => words(s.text)), VIDEOS[id].words, `${id} words per segment`);
    // narrated.py: a silent beat lasts max(1.5, words / 2.5) + 0.35 s
    const seconds = n.segments.reduce((a, s) => a + Math.max(1.5, words(s.text) / 2.5) + 0.35, 0);
    near(seconds, VIDEOS[id].seconds, 0.01, `${id} predicted seconds`);
    assert.ok(seconds >= 120 && seconds <= 180, `${id}: ${seconds} s must be inside 120..180`);
  }
});

// ================================================================== U2 (A2): the scene sources
const codeOnly = (src) => src.replace(/"""[\s\S]*?"""/g, '').replace(/#.*$/gm, '');

test('U2 scenes: beats equal segments, Main(NarratedScene), palette only', () => {
  for (const id of IDS) {
    const src = sceneSrc(id);
    const beats = [...src.matchAll(/self\.beat\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
    assert.deepEqual(beats, VIDEOS[id].beats, `${id}: self.beat ids, once each, in the JSON order`);
    assert.match(src, /class\s+Main\(\s*NarratedScene\s*\)\s*:/, `${id}: class Main(NarratedScene)`);
    assert.match(src, new RegExp(`narration_id\\s*=\\s*["']${id}["']`), `${id}: narration_id`);
    assert.match(src, /from\s+lib\.narrated\s+import\s+NarratedScene/, `${id}: imports NarratedScene`);
    assert.match(src, /from\s+lib\.palette\s+import\s+[^\n]*\bINPUT\b[^\n]*\bOUTPUT\b/, `${id}: imports the palette`);
    for (const name of ['CART', 'POLAR', 'INPUT', 'OUTPUT', 'INK', 'MUTED', 'BG']) assert.match(src, new RegExp(`\\b${name}\\b`), `${id} uses ${name}`);
    assert.ok(!/#[0-9a-fA-F]{6}\b/.test(src), `${id}: no literal hex colour`);
    assert.ok(!/["']#[0-9a-fA-F]{3,8}["']/.test(src), `${id}: no short hex colour either`);
    const code = codeOnly(src);
    assert.ok(!/\b(RED|BLUE|GREEN|WHITE|BLACK|YELLOW|ORANGE|PINK|PURPLE|TEAL|GOLD|MAROON|GRAY|GREY)(_[A-E])?\b/.test(code), `${id}: no manim colour constants`);
    assert.ok(!/\b(requests|urllib|socket|subprocess|open\()/.test(code), `${id}: no network or file access`);
    assert.ok(!/\bself\.wait\(\s*[0-9.]+\s*\)/.test(code), `${id}: every wait is a fraction of t`);
  }
});

test('U2b every animation inside a beat is sized from t (no bare run_time longer than 0.35 s)', () => {
  for (const id of IDS) {
    const code = codeOnly(sceneSrc(id));
    for (const m of code.matchAll(/run(?:_time)?\s*=\s*([^,)\n]+)/g)) {
      const v = m[1].trim();
      if (/\bt\b/.test(v) || /^run$/.test(v)) continue;                        // 0.4 * t, run=0.08 * t, run=run
      const num = Number(v);
      assert.ok(Number.isFinite(num) && num <= 0.35, `${id}: run_time "${v}" is neither a fraction of t nor a short cross-fade`);
    }
  }
});

// ================================================================== U3 (A2): what the narration says
test('U3 motion-time says the numbers of the story', () => {
  const t = allText('motion-time');
  assert.match(t, /u equals 4 minus y squared/i);
  assert.match(t, /v equals 4y/i);
  assert.match(t, /Re w equals one half|real part one half/i);
  assert.match(t, /Re w equals one half/i);
  assert.match(t, /real part one half/i);
  assert.match(t, /Cartesian/);
  assert.match(t, /polar/);
  assert.match(t, /focus/i);
  assert.match(t, /parabola/i);
  assert.match(t, /w equals i z minus 2 i/i);
  assert.match(t, /parametrize, push forward, eliminate/i);
  assert.match(t, /circle opens into a line/i);
  assert.match(t, /inverts the length and flips the angle/i);
});

test('U3 zoom-cr says the numbers of the story', () => {
  const t = allText('zoom-cr');
  assert.match(t, /cent(re|er) A/);
  assert.match(t, /radius[^.]*\bB\b/);
  assert.match(t, /no mirror/i);
  assert.match(t, /u sub x equals v sub y/i);
  assert.match(t, /u sub y equals minus v sub x/i);
  assert.match(t, /2z plus 1/);
  assert.match(t, /Cartesian/);
  assert.match(t, /polar/);
  assert.match(t, /microscope/i);
  assert.match(t, /Cauchy-Riemann/);
  assert.match(t, /conjugate of z zero/i);
  assert.match(t, /Opposite directions share a dot/);
  assert.match(t, /nowhere/i);
});

// ================================================================== U4 (A4): the constants are the story's (markers in the sources)
const squash = (s) => s.replace(/\s+/g, '');
test('U4 motion-time derives its curves from the maps, and asserts the story numbers', () => {
  const src = squash(codeOnly(sceneSrc('motion-time')));
  assert.ok(src.includes('defcheck_numbers():'), 'check_numbers is defined');
  assert.ok(/construct\(self\):check_numbers\(\)/.test(src), 'check_numbers() is the first statement of construct');
  assert.ok(src.includes('zout=lambdas:zin(s)**2'), 'the parabola is the line pushed through z**2');
  assert.ok(src.includes('zout=lambdas:1/zin(s)'), 'the reciprocal image is 1/z of the circle');
  assert.ok(src.includes('w.imag**2/16'), 'u = 4 - v^2/16 is asserted');
  assert.ok(src.includes('.real-0.5)<1e-9'), 'Re w = 1/2 is asserted');
  assert.ok(src.includes('1j*complex(2,y)-2j'), 'i z - 2 i is applied to x = 2');
});

test('U4 zoom-cr computes A and B by formula and uses the three story examples', () => {
  const src = squash(codeOnly(sceneSrc('zoom-cr')));
  assert.ok(src.includes('return(fx-1j*fy)/2,(fx+1j*fy)/2'), 'A = (f_x - i f_y)/2 and B = (f_x + i f_y)/2');
  for (const f of ['deff_conj(z)', 'deff_zz(z)', 'deff_abs2(z)', 'deff_re(z)']) assert.ok(src.includes(f), `${f} is defined`);
  assert.ok(src.includes('z*z+z'), 'z^2 + z');
  assert.ok(src.includes('abs(A-(2*z0+1))<1e-6'), 'A = 2 z + 1 is asserted for z^2 + z');
  assert.ok(src.includes('abs(A-z0.conjugate())<1e-6'), 'A = conj z0 is asserted for |z|^2');
  assert.ok(src.includes('abs(B-z0)<1e-6'), 'B = z0 is asserted for |z|^2');
  assert.ok(/construct\(self\):check_numbers\(\)/.test(src), 'check_numbers() is the first statement of construct');
  assert.ok(src.includes('Z0=complex(0.5,0.5)'), 'the point under the microscope is 1/2 + i/2');
});

// ================================================================== U5 (section 6): every number the films state, against js/core/complex.js
test('U5 2.1.2: x = 2 under z^2 (Cartesian and polar)', () => {
  for (const y of [-3, -2, -1, 0, 1, 2, 3]) {
    const z = C(2, y), w = X.mul(z, z);
    near(w.re, 4 - y * y); near(w.im, 4 * y); near(w.re, 4 - (w.im * w.im) / 16);
    near(X.abs(w), 8 - w.re, 1e-9, 'distance to focus 0 equals distance to the line u = 8');
    const th = X.Arg(z);
    near(X.abs(z), 2 / Math.cos(th)); near(X.abs(w), X.abs(z) ** 2); near(X.Arg(w), 2 * th); near(X.abs(w), 8 / (1 + Math.cos(2 * th)));
  }
  nearC(X.mul(C(2, 2), C(2, 2)), C(0, 8)); nearC(X.mul(C(2, 1), C(2, 1)), C(3, 4)); nearC(X.mul(C(2, 3), C(2, 3)), C(-5, 12));
  near(deg(2 * Math.atan2(1, 2)), 53.13010235415598);
});

test('U5 2.1.3: x = 2 under iz - 2i is the real axis; a quarter turn about 1 - i', () => {
  const f = (z) => X.sub(X.mul(X.I, z), C(0, 2));
  for (const y of [-2, -1, 0, 1, 2]) nearC(f(C(2, y)), C(-y, 0));
  nearC(f(C(1, -1)), C(1, -1));
  nearC(X.div(X.sub(f(C(1, 2)), f(C(-3, 5))), X.sub(C(1, 2), C(-3, 5))), C(0, 1));
  for (const z of [C(0.5, 0.5), C(2, 1), C(-1, 3)]) nearC(f(z), X.add(C(1, -1), X.mul(X.I, X.sub(z, C(1, -1)))));
});

test('U5 2.5.1: |z - 1| = 1 under 1/z is Re w = 1/2', () => {
  for (const d of [-60, -45, 0, 45, 60]) {
    const th = (d * Math.PI) / 180, z = X.mul(C(2 * Math.cos(th), 0), X.expi(th)), w = X.inv(z);
    near(X.abs(X.sub(z, C(1, 0))), 1); near(w.re, 0.5); near(w.im, -0.5 * Math.tan(th)); near(X.Arg(w), -th); near(X.abs(w), 1 / (2 * Math.cos(th)));
  }
  nearC(X.inv(C(1, 1)), C(0.5, -0.5)); nearC(X.inv(C(1, -1)), C(0.5, 0.5)); nearC(X.inv(C(2, 0)), C(0.5, 0));
  nearC(X.inv(X.expi(Math.PI / 3)), C(0.5, -Math.sqrt(3) / 2));
});

test('U5 1.5.1: the line from 2 + i to -3 - 3i', () => {
  const slide = X.sub(C(-3, -3), C(2, 1));
  nearC(slide, C(-5, -4)); near(X.abs(slide), Math.sqrt(41)); near(X.Arg(slide), -2.4668517113662407); near(deg(X.Arg(slide)), -141.34019174590992);
  const z = (t) => X.add(C(2, 1), X.scale(slide, t));
  nearC(z(0), C(2, 1)); nearC(z(0.25), C(0.75, 0)); nearC(z(0.5), C(-0.5, -1)); nearC(z(0.75), C(-1.75, -2)); nearC(z(1), C(-3, -3));
  near(X.abs(C(2, 1)), Math.sqrt(5)); near(deg(X.Arg(C(2, 1))), 26.56505117707799);
});

const z0 = C(0.5, 0.5);
const fzz = (z) => X.add(X.mul(z, z), z);
const fabs2 = (z) => C(z.re * z.re + z.im * z.im, 0);

test('U5 3.1.1: z^2 + z at 1/2 + i/2 has f\' = 2 + i, turn 26.565 degrees, stretch sqrt 5', () => {
  nearC(fzz(z0), C(0.5, 1));
  const fp = X.add(X.scale(z0, 2), C(1, 0));
  nearC(fp, C(2, 1)); near(X.abs(fp), Math.sqrt(5)); near(X.Arg(fp), 0.4636476090008061); near(deg(X.Arg(fp)), 26.56505117707799);
  for (const q of X.directionalQuotients(fzz, z0, 1e-3, 24)) nearC(q.q, X.add(fp, X.fromPolar(1e-3, q.phi)), 1e-6);
  const L = X.localLinear(fzz, z0); nearC(L.A, C(2, 1), 1e-6); nearC(L.B, C(0, 0), 1e-6);
  const J = X.jacobian(fzz, z0); near(J.ux, 2, 1e-6); near(J.uy, -1, 1e-6); near(J.vx, 1, 1e-6); near(J.vy, 2, 1e-6);
  near(X.abs(z0), Math.SQRT1_2); near(deg(X.Arg(z0)), 45);
});

test('U5 3.1.2: |z|^2 has A = conj z0, B = z0; the circle shrinks to 0 only at z0 = 0', () => {
  for (const z of [C(0.5, 0.5), C(1.2, 0.9), C(-0.3, 0.8)]) {
    const L = X.localLinear(fabs2, z); nearC(L.A, X.conj(z), 1e-6); nearC(L.B, z, 1e-6); near(X.abs(L.A), X.abs(L.B), 1e-6);
    for (const { phi, q } of X.directionalQuotients(fabs2, z, 1e-6, 24)) nearC(q, X.add(X.conj(z), X.mul(z, X.expi(-2 * phi))), 1e-4);
  }
  const L = X.localLinear(fabs2, C(1.2, 0.9)); near(X.abs(L.B), 1.5, 1e-6); nearC(L.A, C(1.2, -0.9), 1e-6);
  const dq = X.directionalQuotients(fabs2, C(0.5, 0.5), 1e-6, 4); nearC(dq[0].q, C(1, 0), 1e-4); nearC(dq[1].q, C(0, -1), 1e-4);
  const L0 = X.localLinear(fabs2, C(0, 0)); nearC(L0.A, C(0, 0), 1e-6); nearC(L0.B, C(0, 0), 1e-6);
  const J1 = X.jacobian(fabs2, C(0.5, 0.5)); near(J1.ux, 1, 1e-6); near(J1.vy, 0, 1e-6);
});

test('U5 conj z (B = 1) never shrinks; Re z (P6) is the circle of centre 1/2 and radius 1/2', () => {
  const fc = (z) => X.conj(z), fr = (z) => C(z.re, 0);
  let L = X.localLinear(fc, z0); nearC(L.A, C(0, 0), 1e-6); nearC(L.B, C(1, 0), 1e-6);
  for (const { phi, q } of X.directionalQuotients(fc, z0, 0.1, 24)) nearC(q, X.expi(-2 * phi), 1e-9);
  L = X.localLinear(fr, z0); nearC(L.A, C(0.5, 0), 1e-6); nearC(L.B, C(0.5, 0), 1e-6);
  const dq = X.directionalQuotients(fr, z0, 0.1, 4); nearC(dq[0].q, C(1, 0), 1e-9); nearC(dq[1].q, C(0, 0), 1e-9);
  for (const { q } of X.directionalQuotients(fr, z0, 0.1, 24)) near(X.abs(X.sub(q, C(0.5, 0))), 0.5, 1e-9);
  const J = X.jacobian(fr, z0); near(J.ux, 1, 1e-6); near(J.vy, 0, 1e-6);
});

test('U5 3.2.1: e^x(cos y + i sin y) at ln 2 + i pi/3 has J = [[1, -sqrt3], [sqrt3, 1]], f\' = f = 2 e^{i pi/3}', () => {
  const zz = C(Math.log(2), Math.PI / 3), s3 = Math.sqrt(3);
  const J = X.jacobian((z) => X.exp(z), zz, 1e-6);
  near(J.ux, 1, 1e-6); near(J.vy, 1, 1e-6); near(J.uy, -s3, 1e-6); near(J.vx, s3, 1e-6);
  nearC(X.exp(zz), C(1, s3)); near(X.abs(X.exp(zz)), 2); near(X.Arg(X.exp(zz)), Math.PI / 3);
  const L = X.localLinear((z) => X.exp(z), zz, 1e-6); nearC(L.A, C(1, s3), 1e-6); nearC(L.B, C(0, 0), 1e-6);
});

// ================================================================== U6 (A1): the rendered files, for every video that has been rendered
const ffprobe = (file, entries) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'json', file], { encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout) : null;
};
const vttCues = (txt) => txt.replace(/\r/g, '').split(/\n\n+/).map((b) => b.trim().split('\n')).filter((l) => /-->/.test(l[1] || l[0]))
  .map((l) => { const i = /-->/.test(l[0]) ? 0 : 1; const m = l[i].match(/(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/);
    const sec = (h, mi, s, ms) => +h * 3600 + +mi * 60 + +s + +ms / 1000; return { start: sec(...m.slice(1, 5)), end: sec(...m.slice(5, 9)), text: l.slice(i + 1).join('\n') }; });

for (const id of IDS) {
  test(`U6 ${id}: captions are the narration, one cue per segment, in order (when rendered)`, (t) => {
    const f = path.join(ROOT, 'media', 'video', `${id}.vtt`);
    if (!fs.existsSync(f)) return t.skip(`${id}.vtt not rendered yet`);
    const cues = vttCues(fs.readFileSync(f, 'utf8')), n = narration(id);
    assert.equal(cues.length, n.segments.length, 'one cue per segment');
    cues.forEach((c, i) => {
      assert.equal(c.text.trim(), n.segments[i].text.trim(), `cue ${i} text`);
      assert.ok(c.end > c.start, `cue ${i} has length`);
      if (i === 0) near(c.start, 0, 0.001, 'first cue starts at 0'); else near(c.start, cues[i - 1].end, 0.002, `cue ${i} follows cue ${i - 1}`);
    });
    const total = cues[cues.length - 1].end;
    assert.ok(total >= 120 && total <= 180, `${id}: last cue ends at ${total}, want 120..180`);
  });

  test(`U6 ${id}: mp4 size, duration and manifest entry (when rendered)`, async (t) => {
    const f = path.join(ROOT, 'media', 'video', `${id}.mp4`);
    if (!fs.existsSync(f)) return t.skip(`${id}.mp4 not rendered yet`);
    const size = fs.statSync(f).size;
    assert.ok(size < 15 * 1024 * 1024, `${id}.mp4 is ${size} bytes, want under 15 MB`);
    const probe = ffprobe(f, ['-show_entries', 'format=duration:stream=codec_type,height']);
    if (probe) {
      const seconds = Number(probe.format.duration);
      assert.ok(seconds >= 120 && seconds <= 180, `${id}: ${seconds} s, want 120..180`);
      near(seconds, VIDEOS[id].seconds, 1.0, 'duration is the designed length when silent (audio changes it)');
      const h = (probe.streams.find((s) => s.codec_type === 'video') || {}).height;
      if (h && h <= 480) assert.ok(size < 4 * 1024 * 1024, `a 480p render is under 4 MB (${size})`);
    }
    const mod = await import(pathToFileURL(path.join(ROOT, 'media', 'manifest.js')).href + `?t=${Date.now()}`);
    const v = mod.VIDEOS.find((x) => x.id === id);
    assert.ok(v, `media/manifest.js lists ${id}`);
    assert.equal(v.station, VIDEOS[id].station); assert.equal(v.src, `media/video/${id}.mp4`); assert.equal(v.captions, `media/video/${id}.vtt`);
    assert.ok(v.seconds >= 120 && v.seconds <= 180);
  });
}
```

### Appendix E. `tests/interact/i2-videos-ch2.mjs`

```js
// tests/interact/i2-videos-ch2.mjs: the two films are served, captioned and wired (acceptance criterion A1, the browser half).
//   node tools/smoke.mjs --route mappings,derivative --script tests/interact/i2-videos-ch2.mjs --out docs/review/iter-2/i2-videos-ch2
// Design: docs/designs/iter-2/i2-videos-ch2.md section 7.3. Runs at desktop (1280), phone (390) (and dark with --dark).
// Nothing on the stations is touched. On each route the script checks both films through the manifest (so a missing render is one
// clear failure), then builds the video panel of the film that belongs to the route (or inspects the one the station embeds) and
// reads back what the browser parsed: the structure, the captions as text-track cues and the width at this viewport.
// The harness' Chromium may lack the H.264 decoder: then the panel ends in data-state="error", which is accepted (and logged);
// structure and cues are asserted either way.

const FILMS = [
  { id: 'motion-time', station: 'mappings', beats: ['intro', 'stroke', 'linear', 'square', 'recip', 'paper'] },
  { id: 'zoom-cr', station: 'derivative', beats: ['intro', 'ring', 'move', 'quotient', 'mirror', 'cr', 'abs2'] },
];

// A decoder that is missing is not a bug of the film. Only the two film files are excused, and only for a failed media load.
export const expectedErrors = [
  /^request failed: \S+\/media\/video\/(?:motion-time|zoom-cr)\.mp4/,
  /^console\.error: .*(?:DEMUXER_ERROR|PIPELINE_ERROR|MEDIA_ERR_SRC_NOT_SUPPORTED|Failed to load because no supported source)/,
];

export default async function (page, ctx) {
  const { assert, log, route } = ctx;
  const phone = ctx.viewport.width < 500;
  const mine = FILMS.find((f) => f.station === route) || FILMS[0];

  // The dev server of the harness serves .mp4 and .vtt as application/octet-stream; serve the real bytes with the right types, as GitHub Pages does.
  await page.route('**/media/video/*', async (r) => {
    const res = await r.fetch();
    const url = r.request().url();
    const type = /\.vtt(?:[?#]|$)/.test(url) ? 'text/vtt; charset=utf-8' : /\.mp4(?:[?#]|$)/.test(url) ? 'video/mp4' : res.headers()['content-type'];
    await r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': type } });
  });

  // ---------- 1. the manifest lists both films (written by tools/videos/render.mjs) ----------
  const manifest = await page.evaluate(async () => {
    const m = await import(new URL('./media/manifest.js', location.href).href);
    return m.VIDEOS.map((v) => ({ id: v.id, station: v.station, src: v.src, captions: v.captions, seconds: v.seconds, title: v.title, summary: v.summary }));
  });
  for (const f of FILMS) {
    const v = manifest.find((x) => x.id === f.id);
    assert(v, `media/manifest.js has no entry for "${f.id}" (run: node tools/videos/render.mjs --only motion-time,zoom-cr --quality l)`);
    assert(v.station === f.station, `${f.id}: station is "${v.station}", want "${f.station}"`);
    assert(v.src === `media/video/${f.id}.mp4`, `${f.id}: src is "${v.src}"`);
    assert(v.captions === `media/video/${f.id}.vtt`, `${f.id}: captions is "${v.captions}"`);
    assert(v.seconds >= 120 && v.seconds <= 180, `${f.id}: ${v.seconds} s is outside 120..180`);
  }
  log('manifest lists both films with their stations, sources and captions');

  // ---------- 2. captions equal the narration, cue by cue (fetched as text, parsed here) ----------
  for (const f of FILMS) {
    const r = await page.evaluate(async (id) => {
      const n = await (await fetch(`media/narration/videos/${id}.json`)).json();
      const vtt = await (await fetch(`media/video/${id}.vtt`)).text();
      const cues = vtt.replace(/\r/g, '').split(/\n\n+/).map((b) => b.trim().split('\n')).filter((l) => l.some((x) => /-->/.test(x)))
        .map((l) => { const i = l.findIndex((x) => /-->/.test(x)); const m = l[i].match(/(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/);
          const s = (a, b, c, d) => +a * 3600 + +b * 60 + +c + +d / 1000; return { start: s(...m.slice(1, 5)), end: s(...m.slice(5, 9)), text: l.slice(i + 1).join('\n') }; });
      return { segments: n.segments, cues, head: vtt.slice(0, 6) };
    }, f.id);
    assert(r.head === 'WEBVTT', `${f.id}.vtt does not start with WEBVTT`);
    assert(r.cues.length === r.segments.length && r.cues.length === f.beats.length, `${f.id}: ${r.cues.length} cues, ${r.segments.length} segments`);
    r.cues.forEach((c, i) => {
      assert(r.segments[i].id === f.beats[i], `${f.id}: segment ${i} is "${r.segments[i].id}", want "${f.beats[i]}"`);
      assert(c.text.trim() === r.segments[i].text.trim(), `${f.id}: cue ${i} (${f.beats[i]}) text differs from the narration`);
      assert(c.end > c.start && (i === 0 ? Math.abs(c.start) < 0.001 : Math.abs(c.start - r.cues[i - 1].end) < 0.002), `${f.id}: cue ${i} timing`);
    });
    const v = manifest.find((x) => x.id === f.id);
    assert(Math.abs(r.cues[r.cues.length - 1].end - v.seconds) <= 1.5, `${f.id}: last cue ends at ${r.cues[r.cues.length - 1].end}, manifest says ${v.seconds} s`);
  }
  log('captions equal the narration, cue by cue, in order');

  // ---------- 3. the mp4 is an mp4 and under the size limit ----------
  for (const f of FILMS) {
    const r = await page.evaluate(async (id) => {
      const buf = await (await fetch(`media/video/${id}.mp4`)).arrayBuffer();
      const b = new Uint8Array(buf);
      return { size: b.length, ftyp: String.fromCharCode(...b.slice(4, 8)) };
    }, f.id);
    assert(r.ftyp === 'ftyp', `${f.id}.mp4 does not start with an ISO box (got "${r.ftyp}")`);
    assert(r.size > 200000 && r.size < 15 * 1024 * 1024, `${f.id}.mp4 is ${r.size} bytes, want 200 kB to 15 MB`);
  }
  log('both mp4 files are real mp4 files under 15 MB');

  // ---------- 4. the panel in a real browser (the station's own, or a fixture built with listen.js) ----------
  const id = mine.id;
  const r = await page.evaluate(async ({ id, phone }) => {
    const view = document.getElementById('view');
    let panel = document.getElementById('video-' + id);
    const embedded = !!panel;
    if (!panel) {
      const L = await import(new URL('./js/core/listen.js', location.href).href);
      const host = document.createElement('section');
      host.id = 'i2v-host';
      view.appendChild(host);
      panel = await L.videoPanel(host, id);
    }
    if (!panel) return { error: `videoPanel(${id}) resolved null: the manifest has no usable entry` };
    const video = panel.querySelector('video');
    const track = panel.querySelector('track');
    const out = {
      embedded,
      structure: !!(video && video.hasAttribute('controls') && video.hasAttribute('playsinline') && video.getAttribute('preload') === 'metadata'),
      source: (panel.querySelector('source') || {}).getAttribute ? panel.querySelector('source').getAttribute('src') : null,
      track: track ? { kind: track.getAttribute('kind'), def: track.hasAttribute('default'), src: track.getAttribute('src') } : null,
      title: (panel.querySelector('h2') || {}).textContent || '',
      summary: (panel.querySelector('p.muted') || {}).textContent || '',
    };
    if (track) {
      track.track.mode = 'hidden';                                     // load the cues without drawing them
      await new Promise((res) => {
        const done = () => res();
        if (track.readyState === 2) return res();
        track.addEventListener('load', done); track.addEventListener('error', done); setTimeout(done, 5000);
      });
      out.readyState = track.readyState;
      const cues = track.track.cues ? [...track.track.cues] : [];
      out.cues = cues.map((c) => ({ start: c.startTime, end: c.endTime, text: c.text }));
    }
    await new Promise((res) => { const t0 = performance.now(); const tick = () => (panel.getAttribute('data-state') !== 'loading' || performance.now() - t0 > 4000 ? res() : setTimeout(tick, 100)); tick(); });
    out.state = panel.getAttribute('data-state');
    const rect = panel.getBoundingClientRect();
    out.width = rect.width; out.vw = document.documentElement.clientWidth;
    out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    // placement: a station embeds the panel after its first picture (a canvas or an svg), never before it
    const pic = view.querySelector('canvas, svg');
    out.afterPicture = pic ? !!(panel.compareDocumentPosition(pic) & Node.DOCUMENT_POSITION_PRECEDING) : null;
    out.audio = !!(panel.querySelector('audio'));
    const host = document.getElementById('i2v-host');
    if (host) host.remove();
    return out;
  }, { id, phone });
  assert(!r.error, r.error);
  assert(r.structure, `${id}: the video needs controls, playsinline and preload="metadata"`);
  assert(r.source === `media/video/${id}.mp4`, `${id}: source is "${r.source}"`);
  assert(r.track && r.track.kind === 'captions' && r.track.def && r.track.src === `media/video/${id}.vtt`, `${id}: needs <track kind="captions" default src=".../${id}.vtt">`);
  assert(/^Watch \(2–3 min\)/.test(r.title), `${id}: panel heading is "${r.title}"`);
  assert(/Silent, with captions|With voice and captions/.test(r.summary), `${id}: summary line is "${r.summary}"`);
  assert(r.readyState === 2 && r.cues.length === mine.beats.length, `${id}: the browser parsed ${r.cues ? r.cues.length : 'no'} cues (readyState ${r.readyState}), want ${mine.beats.length}`);
  assert(r.cues.every((c, i) => c.end > c.start && (i === 0 || c.start >= r.cues[i - 1].start)), `${id}: parsed cues must be in order`);
  assert(r.state === 'ready' || r.state === 'error', `${id}: panel still "${r.state}" after 4 s`);
  if (r.state === 'error') log('this Chromium cannot decode the H.264 stream: structure and captions checked, playback not');
  assert(r.width <= r.vw + 0.5, `${id}: the panel is ${r.width}px wide in a ${r.vw}px viewport`);
  assert(r.overflow <= 1, `${id}: the page overflows by ${r.overflow}px`);
  if (r.embedded) assert(r.afterPicture !== false, `${id}: the embedded panel comes before the station's first picture`);
  else log(`(not embedded on #${route} yet: that is i2-decisions-everywhere; the fixture panel was checked instead)`);
  log(`${id}: panel ok at ${phone ? 'phone' : 'desktop'} width (${Math.round(r.width)} px), ${r.cues.length} cues parsed by the browser`);
}
```
