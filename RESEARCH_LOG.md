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
