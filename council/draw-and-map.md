# Council: draw-and-map

The student draws the set. The other plane paints its image, cell by cell, in the same order, and every purple corner is f of its green corner.

One ink, three maps. z² doubles the angle (§2.2). e^z turns height into angle inside the fundamental strip (§5.1). Log z turns that angle back into height, and a sector into a rectangle (§5.2). A formula box takes anything the parser already accepts, including sin z.

A little square rides the pen. Where the derivative is a turn and a stretch, the purple copy matches that turn. At 0 for z², or on the cut for Log, the sentence goes false.

A point can walk the path. The steps Σ f(z) Δz add up, and off a cut they match the antiderivative. That sum is Chapter 6, so the page shows the number and does not draw a second picture of it.

Cut the shape-stamp buttons, the integral chain, a fourth chip, and any iteration. Hand the cells to the blanks, the string forest, the sound, and the zoom.

## 1. The vision

The learner is the author of the set. The book already draws the sets for them: a sector under z² (Figure 2.12), a rectangle under e^z (Figure 5.3), a sector under Log (Figure 5.4). Those figures are right, and they are finished before the student arrives. Nothing the student does can change the ink.

This aspect reverses that. The green ink is whatever the hand just did: a sector, a strip, a ring, a scribble, a loop that shades its inside. The purple plane is not a second drawing. It is the same ink after f, tile by tile, so a bent tile on the right is the image of a square on the left and of no other square. The correspondence is the colour ramp. Dark is what was painted first. Bright is what was painted last. The same order runs on both planes, which is the 3Blue1Brown move: a region is a stack of coloured pieces, and you watch the stack land.

The sentence under the picture is not a slogan. It is true for the opening sector and false when the hand crosses an orange line. For z² the orange rays are Arg z = ±π/2, where doubling leaves the home step (−π, π]. For e^z the orange lines are the edges of the fundamental strip, Im z = ±π (Figure 5.2). For Log the orange ray is the branch cut. The hand is the thing that flips the sentence. The chip only chooses which sentence is at stake.

The opening ink is one sector, 0.7 ≤ r ≤ 2.15 and 0 ≤ Arg z ≤ π/4, chosen so it sits inside the strip and still reads on a window wide enough to show Im z = π. Its outer corner is about 1.52 + 1.52i.

- Under z² that corner goes to 4.62i, and the sector opens from π/4 to π/2. Arg w = 2 Arg z.
- Under Log it goes to about 0.765 + 0.785i. The sector becomes a rectangle, which is Figure 5.4.
- Under e^z the argument of the image equals the height, 1.52. The point one period lower, z − 2πi, lands on the same purple point (Figure 5.1, the period in Equation (5.2)).

Same green ink. Three different landings. That is the whole lesson.

## 2. Six designs

Each one names the gesture, the mark that moves, and the claim. The first four are on the prototype page. The last two are the handoffs, and they are not built.

### 2.1 The mosaic

Gesture: draw on the left plane. A stroke lays a strip of squares. A loop that ends near its start shades the inside, even-odd, and the shade stops at 1800 squares.

Mark: the purple tiles, painted in the same order as the green ones. The purple curve on top of them is the image of the boundary, vertex for vertex.

Claim: each purple corner is f of its green corner. This is checked, not assumed. A tile whose image jumps (the cut of Log, a pole) is kept as data and not filled, so the picture never draws a line across a gap.

Book: §2.2 for the sector under z², Figure 2.12 and Example 2.12 (quadrant I lands on quadrants I and II). §5.1 Example 5.2 and Figure 5.3 for a rectangle under e^z. §5.2 Figure 5.4 for a sector under Log. Exercise 1 of §2.2 asks for the strip 1 < x < 2 under z²; that strip is something the student draws, not a chip.

### 2.2 Quadrant, sector, annulus, strip

Gesture: still the pen. These four are the shapes the book asks for, not a second row of buttons. The three chips are already the ceiling.

Mark: the boundary the student actually drew. A later pass may snap a stroke to one of these four only when the stroke is already close to it. The prototype does not snap. A snap that quietly changes the ink would make the exactness check a lie.

Claim, once the ink really is that set:

- Quadrant I under z²: the image is quadrants I and II. Example 2.12, Figure 2.13.
- Sector 0 < Arg z < π/4 under zⁿ: the image opens n times as wide. §2.2.
- Horizontal strip under e^z: an annular sector, and a strip of height 2π covers the punctured plane once. Figure 5.2, Figure 5.3.
- Sector under Log: a rectangle. Figure 5.4.

The opening sector is the one stamp the page is allowed, and pressing the lit chip puts it back. That is the same control, used twice, not a fourth chip.

### 2.3 The walking point, and the copy one period down

Gesture: Play. One clock, the site's `createMotion`. Pause freezes the point. A later press continues. A finished walk starts again. Reduced motion says Next step and moves a quarter of the way. Nothing is scheduled while the walk is paused.

Mark: a green dot on the ink, a purple dot on its image. For e^z only, an orange ring on that purple dot: the point z − 2πi has the same image. Figure 5.1 draws a whole column of such points. The ring is the column, reduced to the one copy a phone can show without a second plane.

Claim: on the opening sector the ring sits on the purple dot, and the gap is numerical noise (about 10⁻¹⁵). Under z² the same copy lands far away (the readout names the point, the picture does not chase it). The sentence that flips is still the angle sentence, because the ring is true everywhere for e^z and would be a slogan if it were the only claim.

### 2.4 The little square

Gesture: the same pen. The square is fixed at side 0.36 and sits on the moving point. There is no slider for its size.

Mark: a green square on the left. On the right, its true image in purple, and the derivative's prediction in dashed blue: f(z₀) + A(z − z₀), with A taken from the local linear form already in `js/core/complex.js`.

Claim: the purple square and the dashed square agree, and the angle sentence agrees, or they don't.

- True on the opening sector for all three chips.
- False at 0 for z². A = 0, the dashed square collapses, the true image is the quadratic remainder. "There is no angle to double."
- False when |Arg z| > π/2 for z². Twice the angle has left (−π, π], so Arg(z²) is not 2 Arg z. The rays are drawn where this happens.
- False for e^z once Im z leaves (−π, π]. The square still agrees, because e^z is entire. The sentence goes false because the angle is no longer the height. That is the strip, not a failure of the derivative.
- False for Log when the square meets the cut. The two sides of the square differ by about 2π in height, and the local linear form grows a mirror part. The tile is not filled.

Book: §3.1, Equation (3.1), the derivative as a limit of a quotient. The turn-and-stretch reading is multiplication by that quotient, which §1.4 already taught (lengths multiply, angles add). The book names the angle-preserving consequence later, in §9.1. This page does not pretend §5 contains that theorem. It shows the square the quotient predicts.

The shrink, the square getting smaller until the dashed copy and the true copy become one, is the picture of the limit. It is cut. A size slider would be another control, and a playing shrink would fight the walking point for the one clock.

### 2.5 The steps along a path

Gesture: the same path, walked or not. No new control.

Mark that is built: a number. The midpoint sum of f(z) Δz along the stroke, set next to the change in an antiderivative when there is one.

- z² against z³/3, on the outer arc of the sector.
- e^z against e^z, on the segment from 0 to iπ. The sum is −2, within 2×10⁻⁵.
- Log against z Log z − z, and only when the path does not meet the cut. If it does, the page says the comparison is off.

Mark that is not built: a chain of coloured vectors, the pieces of the sum drawn as their own picture. That chain is the Riemann-sum picture, and it is the right picture, and it is Chapter 6, §6.2. The roadmap this council has to slot into stops at Chapter 5. A chain drawn on the w plane would also be read as more image, which is the mistake this page exists not to make. The number is the preview. The chain waits for Chapter 6.

### 2.6 One push of the ink through z² + c

Gesture: not on this page. §4.2 is the map z² + c, applied again and again. One application is a mosaic of the kind already built: the same cells, the formula `z^2 + c`. The second application is an iteration, and iteration is the zoom aspect's picture (Julia, the orbit of 0, the set of c).

Claim, when that aspect takes the cells: the image of a drawn blob under one step of z² + c is exact in the same sense, corner for corner. The fate of the blob, settle or leave, is not this page's sentence.

This design is the joint. It is not a fourth chip.

## 3. Technical approach

No new library. The page is `draw-map.html`. It loads the site's tokens, the four teaching colours, and KaTeX. It does not import from `kit/`, and it is not wired into the hash router, so the Chapter 4 and Chapter 5 map being built alongside this council is left alone. When that map has an exponential stop, the station id to hang this picture on is `draw-map`.

The math lives in `js/draw-map/model.js`, which imports `js/core/parse.js` and `js/core/complex.js` and nothing else. A custom formula is compiled by the existing parser. There is no `eval`. `ln(z)` is accepted as `log(z)`. `e^z`, `exp(z)`, `z^2`, and `log(z)` light the matching chip and keep its sentence. Anything else, including `sin(z)`, is custom: the little-square sentence remains, the strip sentence does not pretend to apply. A bad formula puts the previous text back and shows the parser's own message. Chips stay pressed only while the formula is that function.

A cell is a square of side 0.12. Its image is the four values of f at its corners. `tools/draw-map-check.mjs` recomputes f and requires the stored corners back, to a relative tolerance of 10⁻⁸. The boundary is the same test on every sample of the pushed polyline. Where the image bends, the polyline is bisected, and the new vertex is still exactly f of the midpoint. Where the image jumps, the polyline breaks. The jump test is geometric: the long edge of a tile is more than six times the median edge, and longer than about 1. Filling that tile would invent a region the function does not have.

The derivative square uses `localLinear`, four extra evaluations at the probe, not per tile. Agreement means the true corners sit within 0.4 of |A| times the side, and the mirror part B stays small next to A. That ratio is about 0.07 on the opening corner for z², and it fails at the origin.

The walk uses `createMotion` from `js/core/anim.js`. Paints go through `createFrame`, one at a time. The bitmap is capped at device pixel ratio 3 and a long edge of 1400. Two canvases, stacked under 52rem, side by side above that. The drawing canvas sets `touch-action: none`. At 360px the page does not scroll sideways.

The z window is fixed at 7 across, so the orange lines do not move while the student draws, and Im z = ±π is on the paper. The w window refits the image, between 1.6 and 14 on a side, and the readout says both widths. A shared scale would hide e^z of this sector, whose image runs out past 9. The refit is a choice, and it has a cost: the student cannot compare lengths by eye. The numbers are on the page so the comparison is not lost.

On a phone, 1800 tiles is the hard stop. A scribble that fills the window is told that the shade stopped. Even-odd on a self-crossing loop can shade a surprising inside. The page says "a loop shades the inside" and does not promise a simply connected set.

## 4. How this plugs into the other four

The other four demands in the charter, named as demands. This page does not build them.

**The blanks and the custom functions.** The claim already has a blank. For z² it is "Arg(z²) = ___ Arg z", and the picture fills in 2 when the ink is inside the orange rays, and refuses to fill in 2 when it is not. For e^z the blank is "Arg(e^z) = ___", filled by the height y inside the strip. For Log it is "Im(Log z) = ___", filled by Arg z off the cut. `describeProbe` returns that blank beside the sentence. A fill-in aspect can hide `filled` until the student has said it. The formula box is the custom function they asked for, and it is the parser the site already trusts, not a new language. KaTeX renders the compiled form under the field.

**The two planes and the string forest.** Every tile center and its image is one string, from a point on the lower plane to a point on the upper. The prototype keeps the two planes flat and side by side, because a forest is a different gesture (orbit the pair, not draw the ink). The export is the list of pairs already computed: cell center, four corners, four image corners. A 4D view can colour a slab by which tile it came from. The ramp is the colour. Nothing here has to be rewritten for that, and nothing here should grow a WebGL scene.

**The sound of a point.** The walking point is the hover they described, made into a motion so it does not depend on a pointer that a phone does not hover. At each moment the page has z and w = f(z), both finite or both refused. |w| is a frequency. Arg w is a pan, or a second tone. The orange ring under e^z is the same note as the point one period down, which is a thing a student can hear and then see. This page does not start an audio context. It leaves the probe on `data-probe-re` and `data-probe-im`, updated every paint.

**The infinite zoom, and the live film of this same path.** One step of z² + c on these cells is §4.2. The deeper zoom, the step size, the reset, are that aspect's problem, and they should accept a drawn set as a seed instead of only a point. The walk is already the live vector film: a parameter u from 0 to 1, the same clock a film panel seeks, no precomputed frames. A HyperFrames page of Figure 5.3 would be a second drawing of a rectangle the student can now draw themselves. Prefer the live ink. Keep a film only where the book wants a fixed sequence, which this aspect does not.

## 5. What to cut, and what it costs

Cut, and why:

- A chip for the quadrant, the annulus, or the strip. Three function chips is the ceiling. The hand draws the shape. The opening sector is the one preset, restored by pressing the lit chip again.
- A chip for sin or tan. `sin(z)` typed in the box is Figure 5.7, a vertical segment landing on a hyperbola-like curve. Checked: the samples match. It does not get the strip sentence, because that sentence would be false advertising.
- Snapping a rough stroke onto a textbook set. Useful, and easy to lie with. Out.
- The shrink slider on the little square. One clock, and Play already owns it.
- The coloured chain of the integral. Chapter 6 is past the stop. The number stays, so the sum is not vapour.
- Iteration, Julia, a c slider. One push is a formula. The orbit is the zoom aspect.
- Wiring this into the nav or the hash router now. The book map is being built by another loop. A link from that map, later, is the integration. A second nav item today is a fight.
- Domain colouring, the sphere, the 4D graph. The lab already has them. This page is the ink.
- A shared scale between the planes. It was tried as a default and rejected: e^z of the opening sector leaves the z window, and Log of it shrinks to a postage stamp. The readout prints both widths instead.

Costs that remain, said plainly:

- The z window is 7 across so the strip edges are drawable. The opening sector is a wedge in the first quadrant, not a full-bleed figure. The image window refits, so the landing is the large picture. That is the right emphasis, and it means the left plane looks quieter than a figure in the book.
- The tiles are squares of side 0.12. The mosaic is the image of those squares, not a filled cartoon of the boundary. The boundary is drawn separately, and it is the exact curve. A student who wants a smooth fill is asking for the thing we refused to fake.
- The derivative is a numerical linear form, not the limit written out as h → 0. The square shows the quotient at one size. The limit is the cut shrink.
- Even-odd fill of a messy loop can surprise. The cap of 1800 can stop a shade halfway. Both are reported, not hidden.
- The page is a prototype beside the map, not yet a stop on it. Until the Chapter 5 map links it, a student on the live site will not find it by walking the chapters.

## 6. What the prototype proves

`draw-map.html`, with the math in `js/draw-map/model.js`. Headless checks in `tools/draw-map-check.mjs`.

- The opening sector under z², e^z, Log z, and a typed sin z: every stored image corner recomputes as f of its source corner.
- The angle sentence is true on that sector for z² and false at 0 and past the orange ray.
- The height sentence is true for e^z on the sector and false on a stroke that crosses Im z = π. The image of a vertical line is the circle the book describes, and the period copy lands on it.
- Log turns the sector into a rectangle and withholds the tile that straddles the cut.
- The outer arc matches the change in z³/3. The segment from 0 to iπ under e^z matches −2.
- A bad formula does not change the map. It shows the parser's hint.
- At 360px the page does not scroll sideways. One paint clock, one walk clock.

The three site checks, `node tools/check_vectors.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs`, are untouched by this page and stay green.
