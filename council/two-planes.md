# Council: two planes

## Five lines

1. w = f(z) is a correspondence you can hold: a green z-sheet and a purple w-sheet in one rotatable view, joined by a forest of strings.
2. Both sheets use the site's domain colouring, hue for the angle of w and brightness for its size, so a string is one colour at both ends.
3. z² covers the purple sheet twice, e^z turns the period strip into rays and circles and misses 0, and Log opens an orange cut into the lines v = π and v = −π.
4. Turning does not recompute. A phone holds a 36×36 forest and a 160² paint; a desk holds 56×56 and 256². The 4D volume and the infinite log spiral are the cuts.
5. It belongs on Chapter 5 §1 and §2, reached from the series in Chapter 4, beside the lab, the branch station, and the 4D projection. It does not replace them.

## 1. The vision

The graph of w = f(z) is four real numbers. Every picture already on the site is one shadow of that graph: a painted plane, a height, a projection, a staircase. The missing picture is the correspondence itself.

Two sheets float in one space. The lower sheet is the z plane. The upper sheet is the w plane. A string joins each sample of an input grid to its image. Drag turns the pair. From above you read the paint. From the side you read the forest. Up is only the gap we opened so the strings have somewhere to go. It is not |w|, and it is not a third coordinate of z. The modulus landscape and the 4D projection already spend the third dimension on a value. This picture spends it on the map.

The paint is the one the lab already uses. On the green sheet, the point z is coloured with f(z). On the purple sheet, the point w is coloured with itself. A string therefore leaves a colour and arrives at the same colour. Black is w = 0. A sharp jump in hue is a seam. The four teaching colours stay what they are: green is the sheet you start from, purple is the sheet you land on, blue is the axes and the grid before and after the map, orange is the branch cut and it is drawn only when the two sides of the negative axis land apart.

## 2. Designs

Each one names the gesture, the mark that moves, and a sentence that is true of one state and false of another. Pages are Howell & Mathews, *Complex Analysis*, 202 Updated Edition.

### 2.1 The pair

This is the prototype, `council/two-planes.html`.

- Gesture: drag turns the pair. Pinch zooms. There is no pan, because pan slides the sheets off the sentence.
- The three chips are z², e^z, and ln z. The formula box is the same choice: a chip stays pressed only while the text is that chip's formula. `z^2`, `exp(z)`, and `log(z)` are the three. `sqrt(z)`, `e^z`, and `z^2+1` type in and the sentence follows the measurement, not the chip.
- Mark: the forest, the blue grid and its image, and two dots. For z² the dots are 0.6 + 0.8i and its opposite, and they share one purple landing. For Log the dots are the two sides of −1, and they land about a full turn apart.
- Claim, computed, not written by hand:
  - z², Chapter 2 §2, page 55, the mapping w = zⁿ. "There is no cut. 0.6 + 0.8i and −0.6 − 0.8i are different points on the green sheet, and both strings land at −0.28 + 0.96i."
  - e^z, Chapter 5 §1, pages 132–134, Identity (5.1) and Figures 5.1, 5.2, and 5.3. The input window is the fundamental strip −π ≤ y ≤ π. "There is no cut. The top and bottom of the green strip land on the same ray, vertical lines become circles, and no string lands on 0."
  - Log, Chapter 5 §2, pages 137–141, Definition 5.2. "The orange ray is a branch cut. The two sides land at 3.06i and −3.06i, about a full turn apart." Figure 5.5, page 141, is the surface this one branch is cut from. It is not drawn here.
- A typed `sqrt(z)` is the other cut, Chapter 2 §4, pages 68–71. The sides land near i and −i, and the sentence does not call that a full turn.

The sentence is false of the other chips. Pressing z² makes the cut sentence false. Pressing ln z makes the double-cover sentence false.

### 2.2 The strip, as Figure 5.2

One gesture, and it is not the orbit. Drag one horizontal line on the green strip, the line y = b with −π < b ≤ π. The mark is the ray it becomes, at angle b. The claim "the ray's angle equals y" is true of that line and false of a vertical line, which becomes the circle |w| = e^a. Exercise 5.1.2, page 135, is this figure: why r₁, r₂, r₃ become those angles, and where ±iπ land. The prototype already shows the whole strip at once, which is the right first look and the wrong single gesture. This is the station to ship if the council keeps one gesture per stop. The orbit becomes the way you hold it, the way the 3D stations already turn, and the drag of the line is the hand.

### 2.3 Open the cut

Drag a point across the orange ray. The mark is the landing. On Log it jumps by about 2πi, from the line v = π to v = −π, which is what the prototype's two orange dots are already measuring at rest. The claim "the value jumped" is true after a crossing and false when the walk stays in the upper half-plane. The same gesture on the principal square root, Figure 2.18 and Figure 2.19, pages 69–70, jumps from one root to the other and the sentence must not say 2πi. The prototype's cut test already separates those two jumps: a gap bigger than 4 is the logarithm, a gap near 2 is the square root.

### 2.4 Climb the sheet

Figure 5.5, page 141, stacks copies of the cut plane, Sₖ, joined upper edge to the next sheet's lower edge, and log on Sₖ is ln r + iθ with θ in (2πk − π, 2πk + π]. The gesture is a drag that goes around 0. The mark is the bead's floor. The claim "one loop added 2πi and one floor" is true when the loop encloses 0 and false when it does not. The square root is the two-sheet version, Figure 2.20, pages 70–71, and the branch station already draws that surface flat-on. This design is the same surface with the strings still attached, so the student sees the cut close by changing floors instead of by jumping.

Draw five floors for the log, not thirty. A floor that leaves the window is recycled. The w-sheet stays one sheet, because the range of each floor is a horizontal strip and together the strips fill the w plane. Putting a new purple sheet on every floor would teach that the output is also multi-valued in the wrong way: the output of one branch is single-valued, and the branches differ by 2πi.

### 2.5 The series becomes the forest

Definition 5.1, page 130, is the series exp(z) = Σ zⁿ/n!. Theorem 5.1, pages 130–131, says the sum is entire and its derivative is itself, by Theorem 4.17. The picture is the same pair of sheets with sₙ in place of exp, and three chips: n = 1, n = 4, n = 12. At n = 1 the map is w = 1 + z, a translate, and the image of x = 0 is not the unit circle. At n = 12, inside the strip the prototype already uses, the image of x = 0 has settled on that circle. The claim "the image of the imaginary segment is the unit circle" is true at n = 12 and false at n = 1.

This is the door from the Chapter 4 pages the book loop is building into Chapter 5. It does not need a new renderer. It needs the partial sum as one more compiled formula, and it must not be a second slider beside the chips.

### 2.6 The volume, named so it can be refused

Identity (5.1) writes e^z = e^x cos y + i e^x sin y. A volume can spend height on u, colour on the angle, and opacity on a gate in v, and a single clipping plane the hand drags. The claim "this slice is the real part" is true for the u-gate and false for the v-gate. That is a real picture and it is the wrong first one. A 48³ raymarch at phone resolution is the frame that drops, and the site already has the honest cheap version: the 4D graph station projects three coordinates and paints the fourth, and the lab's modulus landscape is height = |w| with the same hue. Link those. Do not ship a volume until a phone holds 48³ at a steady frame, measured, with the tab-hidden rule still drawing nothing.

## 3. Technical approach

The prototype is one static page, `council/two-planes.html`. It is not in the router. It does not import from `kit/`. It uses the three.js build already in `vendor/three` (r160) and `OrbitControls`.

The formula is `js/core/parse.js`. `compile` returns a closure. It does not build source text, so a typed f stays inside the site's CSP story. There is no GLSL codegen and there should not be one. A shader for z², exp, and log would make the paint resolution-independent, and it would fork the function the student typed from the function the pixel runs. The CPU evaluator is the one path.

Colour is `colorXY` from `js/core/domaincolor.js`, the same hue and the same rings as the lab. Vertex colours are converted with the same sRGB-to-linear step the other 3D views use, so a string matches the sheet it lands on.

Geometry is rebuilt when the formula changes and when the page crosses 700px wide. It is not rebuilt while you turn.

| | phone, under 700px | desk |
| --- | --- | --- |
| strings | 36×36 = 1,296 | 56×56 = 3,136 |
| paint | 160² | 256² |
| measured | | 56² forest about 1 ms; 256² evaluations of exp about 7 ms, before the colour pass |

A string per pixel would be a wall and would hide both sheets. The paint is the fine grid. The strings are dense enough to show the warp and sparse enough to see through from the side. Log drops the strings whose real part leaves the drawn sheet (3,112 of 3,136 on the desk window). That hole is |z| small, ln|z| past the frame. It is a clamp, and the caption should keep saying so. It is not a value of the function.

WebGL lines wider than one pixel are ignored on phone GPUs. The forest is a line buffer. The blue grid, the green rim, and the purple rim are ribbons, so they stay visible. The pixel ratio is capped at 1.5 and at 1.4 million pixels. MeshBasicMaterial, no lights, so the legend colour is the pixel colour. One animation frame while the orbit is damping, then the loop stops. A hidden tab cancels it. `prefers-reduced-motion` turns damping off and there is no auto-spin. There is no play button, so this picture does not take the station clock. A later "walk the cut" must use `createMotion` and be the only motion on that stop.

If WebGL is missing, the same samples are drawn on two flat canvases and the sentence is the same. Headless Chrome with SwiftShader reported `data-renderer="webgl"`, 3,136 strings, no console errors, and no request outside the page. At 360px, `scrollWidth` equals `clientWidth`.

The windows are chosen per function, in the same units, so magnification is visible. z²'s purple sheet is taller than its green sheet because the corners map to ±4.5i. e^z's green sheet is the tall strip and its purple sheet is a square the annulus fills, with a black spot at 0 that no string touches. Log's purple sheet is the strip −1.55 ≤ u ≤ 1.25, −3.6 ≤ v ≤ 3.6, so v = ±π sit inside it.

## 4. How it plugs into the other four

The blank. The claim is already a sentence with a number in it. On the shipped stop the number can stay closed until the student asks, the way hints do. The three chips are the build-up: z² is a map from Chapter 2 the student can already predict, e^z is Figure 5.2, ln z is the cut. Typed f is how the lab and this picture stay one language. The formula box on the prototype is the proof. The station should not grow a fourth control to keep it. See the cuts.

The drawn set. A stroke on the green sheet is a bundle of these strings, and the purple sheet shows the image as a region, which is the 3Blue1Brown move Shael asked for. This aspect is the transport. The drawing aspect owns the stroke, the quadrant, and the custom shaded set. Do not put a pen on this page.

The sound. The string under the finger has a modulus and an angle. Pitch can follow |w| and a second tone can follow the angle. This picture names the point (z, f(z)). It does not play it. A hover that both sounds and redraws is a second gesture. It belongs on the audio page, reading this model.

The zoom. Orbit zoom is finite. Past the texture it pixelates, and regenerating a 256² paint on every pinch frame is how a phone stalls. Infinite zoom is the fractal station's problem, where a smaller step has to mean more correct iterations. z² + c at one c is one frame of that station. A link can send c here and show the forest of one step. The forest must not grow a Mandelbrot zoom.

The film. A host-clock film can later play design 2.5, the partial sums settling, or design 2.3, the walk across the cut. It cannot take a formula the student types, and it cannot be turned. The live picture stays WebGL for that reason. If a film is added, it uses the site's film clock and it is one film on one station. This prototype is not that film.

The pages that already exist. The lab paints one plane. The branch station draws the cut and the root surface. The 4D graph drops a coordinate. This page is the correspondence those three are shadows of. Phase 1 does not edit them and does not edit the registry. When the Chapter 5 map exists, the stop is a custom station on that map, id `two-planes`, cited to §5.1 for the strip and §5.2 for the cut, with the z² chip cited back to §2.2 so the door opens on a picture the student trusts.

## 5. What to cut

Cut the volume from the first build. It is design 2.6. The cheap shadows are already shipped.

Cut the infinite spiral. Five floors, in its own station, after the one-branch cut is a gesture of its own. The prototype shows one branch and the jump. That is the fact Figure 5.5 is built from. Drawing the staircase before the jump is understood hides the jump.

Cut the formula box from the station. Three chips is the ceiling. The box is a fourth control that sets the same function. Keep it in the lab, and keep the parser, so a typed `sqrt(z)` can still be opened from there. The prototype keeps the box because the brief was to show that a typed f drives the forest. It does. `ln(z)` is refused in the student's own words, and the picture stays on the last good formula.

Cut auto-rotate. It fights reduced motion, it fights the hidden-tab rule, and the drag is the gesture.

Cut a density slider. The width chooses 36 or 56. A slider that sets the same number as the width is a second control.

Cut regenerating the paint during a pinch. Say, in the caption, that zooming in does not add samples. The fractal page is where a deeper zoom gets more accurate.

Cut any edit to `graph4d`, `branches`, `lab`, or the story map in this phase. The book loop is in those files. This page links to them and stops there.

## What the prototype proves

`council/two-planes.html`, with the model in `js/council/planes-model.js` and the view in `js/council/two-planes.js`.

- Three chips and a typed formula, one forest. z², e^z, ln z, and a typed `sqrt(z)` each flip the sentence. A bad name does not throw the picture away.
- Drag turns the pair. The string count stays put, because the buffer is not rebuilt.
- Domain colouring on both sheets, green rim, purple rim, blue grid, orange cut only when the measurement says there is a cut.
- At 360px the page does not scroll sideways, and the forest drops from 3,136 strings to 1,296.
- Headless Chrome drew it with WebGL, SwiftShader, and no console errors. A real phone GPU was not in the room. SwiftShader is not a Mali or an Apple GPU. The budget above is the reason to believe it, not a measurement from a handset.

`node tools/planes-smoke.mjs` checks the sentences, the cut, the double cover, the strip, the broken log guide, and the two rebuild times. The three existing checks were run and stayed green.
