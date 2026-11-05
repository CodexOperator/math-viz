# Deep zoom — infinite zoom, and detail that scales

The picture should get truer as it gets smaller. A step that is half as big should spend its frame on more of the set, and a zoom that passes one double should not go blank or freeze. The recurrence is the one in Howell & Mathews §4.2, `z ↦ z² + c`. The extra digits are that same recurrence, kept.

## The idea

A window on the Mandelbrot set or on a Julia set is a question about one orbit and its neighbours. The centre is the reference orbit, computed as a long integer. Every other pixel stores only how it differs from that orbit. While the whole window still agrees with a short polynomial in that difference, those early steps are skipped. When a pixel stops tracking the reference, that one pixel is iterated directly. The count of steps grows with the depth. Play narrows the window at a rate you set. Pause freezes it and draws nothing more. Reset returns to the wide set in Figure 4.6, page 114.

## Designs

1. **Constant-rate zoom.** Gesture: Play. The mark that moves is the boundary; the green cross stays on the reference point. The claim flips with the depth: at the width of the book’s picture it says the window still fits in one double; below width `10⁻¹³` it says one double has run out; below width `10⁻²⁸` it says two doubles have run out and the reference is a longer integer. Pause is the same button. Reset is the wide set. §4.2, the iteration after the Newton pictures, and Figure 4.6.

2. **The step buys pixels.** On the Julia and Mandelbrot stops, the moving picture at step 0.08 is the old coarse frame (96 or 112 on a side). At step 0.02 it is four times as many pixels. Below that the count stops, and the line says so: a moving frame has a budget. The claim is false at the default step and true once the step has actually enlarged the frame. This is the loop and the drag on those stops, not a new control.

3. **Live zoom follows the window.** Gesture: the zoom while a loop or a fine drag is playing. The mark is the set, which has to move with the axes. Today a tiny step made one click multiply the width by `1.00001`, and a zoom during the live film either cancelled the film or left the bitmap behind. A click now zooms by `1 + step`, and never by less than 2 percent. While the loop is playing, a zoom asks for a new frame of the new window.

4. **The reference is the orbit of one point.** Gesture: the green cross, and the chip that switches Mandelbrot and Julia (`c = −0.75`, the basilica). The readout is the iteration count, the number of digits, and how many steps the series skipped. The fate sentence flips: both fates in the window, everything stayed, or everything left. That is Theorem 4.9, page 113, read off the centre, and the neighbours are only the difference. Julia uses the same recurrence with `c` fixed and the start at the pixel.

5. **A checked depth, not a guessed one.** The page opens on a window that has already been compared, pixel by pixel, with a direct high-precision orbit. Mandelbrot at width `10⁻³⁶·⁹` (57 digits, 1628 iterations, the series skipped 1429). The same centre still matches at width `10⁻⁴²`, and the window is still mixed there. At `10⁻⁴⁸` that neighbourhood is inside, and the count still matches. Julia at `c = −0.75`, width `10⁻³⁴·⁷` (55 digits, 1539 iterations). Both are past the two-double floor of `10⁻²⁸`, where the stations stop. Float64 cannot add a pixel to the centre at either window: the sum is the centre again.

## How it is built

The centre is a decimal integer, a BigInt times a power of ten. The scale is the depth plus 20 guard digits, capped at 360. The reference orbit is `z ↦ z² + c` in that integer. Each step rounds to the nearest unit at that scale. The stored reference for the pixel pass is the float64 value of those integers. For the Mandelbrot set the reference starts at 0 and `c` is the centre; a pixel at offset `ε` carries `δ₀ = 0` and `δ ← 2Xδ + δ² + ε`. For a Julia set, `c` is fixed and `δ₀ = ε`.

A cubic series `δ ≈ Aε + Bε² + Cε³` is built along the reference. It is used only while two things hold for every pixel in the window: the omitted tail is small beside the first term, and `|X| + |δ|` is still under the escape radius, so no pixel can have left yet. The pass then starts at that step. Iterations are `80 + 42 × depth`, capped at 6000. A moving frame uses the full count. Halving it painted pixels as “stayed” when they had only not left yet. The series is what makes the full count cheap: at the Mandelbrot window it skips 1429 of 1628 steps.

A glitch is a pixel whose true point is much closer to 0 than the reference, or a pixel that is still going when the reference has escaped. Those pixels are iterated directly, up to 48 on a moving frame and 400 on the sharp one. A pixel that does not get that direct pass is painted as not inside. It is not called blue.

The page has one clock, `createMotion`. Play narrows the width by a factor each second (`2` by default, settable from 1.25 to 8). The factor is constant in the log of the width, so one second at 2 really halves it. Pause cancels the clock, asks for one sharp frame, and then posts nothing. A hidden tab does not advance the clock. Reduced motion takes one second of zoom and one frame, and the button does not say Pause. The moving frame is 72 pixels on a side; if the view holds still it refines to 144; the sharp frame follows the page width up to 300. The stations’ own live paint uses `detailForStep` and `fillAutoJulia`, so a zoom during that film keeps the low word of the centre and the pixel count that the step bought.

Checked on this machine: a 72-pixel Mandelbrot frame at the deep window is about 40 ms, 144 is about 85 ms, 280 is about 280 ms. The reference is the long-integer part; the pixels are the float part.

## How it meets the other four

The fill-in map can use the fate sentence as a blank that is false somewhere: “this window still fits in one double” is false once Play has crossed `10⁻¹³`, and “everything in this window stayed” is false on the deep Mandelbrot window and true after Reset only if the student has not moved. The same numbers can sit in a typed check, because they are matrix arithmetic, not a generated picture.

Colour already means the same thing here as on the stations. Blue stayed, orange left late, the pale ground left at once, green is the point you are zooming toward. A later 4D or opacity picture can read the same field: the iteration count is the height, and a glitch that was not settled stays out of the blue.

The two planes do not need a second copy of this renderer. The reference point is one address. A string picture can hang one fibre on the green cross and show the orbit of that point in the other plane, the same walk the Julia stop already draws for a single start. The deep window is what that fibre looks like from nearby.

The film clock is this clock. A Manim-style film of a zoom should be the same Play, with the width as the timeline, and it should publish a finished frame rather than a strip. Sound can sit on the green cross later: the iteration count, or the escape of the reference, is a number a tone can follow. It should not be a second clock.

## What to cut

Cut a GPU float-float shader from the first build. It would repeat the pixel pass faster and it would not be what the check compares. The long-integer reference is the part that gets past two doubles. A shader is a speed copy, after the counts match.

Cut rebasing and a full series tree. Glitches at the checked windows are none or a handful. A centre that escapes turns most of the window into direct orbits, and a frame can take seconds. The page recomputes a budget of them and refuses to paint the rest as inside. A second reference, chosen from a pixel that is still inside, is the right next step if a zoom walks into a minibrot and the frame stalls. It is not needed for the windows above.

Cut the page’s zoom at width `10⁻⁶⁰`. The integers go further. The cap is so a sharp frame stays a fraction of a second. Say the cap out loud, the way the stations say they stop at `10⁻²⁸`.

Cut Newton from this prototype. The same difference method applies to a rational map, and it is a different recurrence. Do it when the Julia and Mandelbrot counts have stayed honest.

Cut a place on the story map in this phase. The page is `deep-zoom.html`. It links to the Mandelbrot and Julia stops. It does not take a node while the book map is still moving.

Cut automatic steering. The centre stays put, which is why the Mandelbrot window at this centre is mixed at `10⁻⁴²` and interior at `10⁻⁴⁸`. Steering would keep a filament on screen and it would also move the point the sentence is about. If it comes back, the readout has to say the centre moved.

Cut merging the stations’ loop clock and zoom clock. They can still both run. The prototype does not: one Play owns the width.

## The prototype

`deep-zoom.html` opens on the checked Mandelbrot window. Julia is the other chip. Play, Pause, Reset, and the factor per second are the controls. The checks are in `node tools/fractal-smoke.mjs`: the pixel rule, the zoom floor, and the direct-orbit comparison at both deep windows and at width `10⁻⁴²`.
