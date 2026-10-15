# Design: i1-core-widgets

Goal: `js/core/katex.js`, `js/core/explainer.js`, `js/core/staircase.js` (wave 0, engine, size M).
Owned files: the three modules above, plus (automatically) this file, `tests/unit/i1-core-widgets.test.mjs` and
`tests/interact/i1-core-widgets.mjs`. Nothing else may be edited.
Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md`, `docs/ARCHITECTURE.md` (3.6, 3.7, 3.8, 4, 6, 9),
`docs/goals/iter-1.json` (entry `i1-core-widgets`), `vendor/katex/katex.min.js` (KaTeX 0.16.11), `js/registry.js`,
`tools/smoke.mjs`, `package.json`, `.claude/workflows/study-build-loop.js` (for the ownership rules).

> **Residue cleanup (iteration 1).** `homeStep` snaps a representative within 1e-9 of the seam to the top step, exactly `seam + 2π` (`homeStep(13 * Math.PI).theta === Math.PI`, never −π); `createStaircase` has the options `homeLabel`, `showK` and `compact` and the method `setHomeLabel(name | null)`, and `update(null)` names the row buttons `step k = n: no angle at 0`; `createExplainer` has `spec.sameLabel` (default `same point`) and writes `data-narrow` one animation frame after a resize, so the ResizeObserver callback never changes the size it observes; the row-label column is 8rem; a second seam crossing inside 0.9 s restarts the pulse. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

Status of this design: every behaviour below was prototyped in a throwaway harness outside the repo and checked there:
13 unit tests pass in Node 22; the interaction script in Appendix B passes at desktop (1280x860), phone (390x844) and
desktop-dark with zero console errors, both on a minimal stub shell and on a copy of the repo's real shell (`index.html`, `css/theme.css`, `css/components.css`, `js/app.js` as present in the working tree when this was written); screenshots were read in light and dark. The prototype lives at
`/tmp/claude-0/-home-user-math-viz/9820ea62-47b0-598f-94da-65a18bf10ac9/scratchpad/i1cw/` (informational; it may not exist when you
read this, and this document is binding where they differ). Numbers in sections 6 and 8 come from that harness.

---

## 0. Reading notes: what is pinned, what this design adds, what differs from ARCHITECTURE

No code exists yet for these three modules, and `js/registry.js` is the only file under `js/`. So nothing on disk overrides
ARCHITECTURE 3.6, 3.7, 3.8; the signatures there are implemented exactly. Everything this design adds is additive and optional
(a station written only from ARCHITECTURE keeps working with the defaults below). Decisions that a builder or reviewer might
otherwise trip over:

| # | Decision | Why |
|---|---|---|
| D1 | `explainer.js` imports `tex` from `./katex.js`. `katex.js` and `staircase.js` import nothing. | The goal text says "no imports between the three files", but acceptance A3 and ARCHITECTURE 3.7 require cells to be rendered "via katex.tex". Both files belong to this one goal, which is the same exception ARCHITECTURE 1 grants `parse.js -> complex.js`. The rule exists so concurrent goals do not depend on each other; it does not apply inside one goal. `staircase.js` must NOT import `complex.js` (another goal): it carries its own tiny exact-pi formatter. None of the three may import `theme.js` or `store.js`. |
| D2 | The returned `el` is the container element that was passed in. The widget's own root is a child: `div.explainer-wrap` / `div.staircase-wrap`. | Predictable; ids live on children so a station can keep its own ids on the container. |
| D3 | Staircase rows are anchored to the home step: row `k` shows `Arg + 2*pi*k`, `k = 0` is always the home step, and `update(theta)` accepts any representative (14pi/3, -pi and 2pi/3 give the same list). | `onPick(k)` is used by `roots` and `principal-root` to mean "k-th step above Arg" (root number k); a list anchored to the raw input would change meaning with the representative. Consequence: the shaded band always sits behind the k = 0 row and never moves; a seam change re-labels the rows instead of sliding the band. |
| D4 | `tint()` bakes a hex colour into `\textcolor`. When a token cannot be resolved it falls back to `currentColor`, not to the token name. | Verified: KaTeX 0.16.11 accepts only `#rgb`, `#rrggbb`, six bare hex digits and bare letter names for colours. It REJECTS `--cart`, `rgb(...)`, `hsl(...)`, `oklch(...)`, `#rrggbbaa` and `#rgba`. Any computed colour that is not hex is therefore converted with a 1x1 canvas probe. The A2 regex `/^\\textcolor\{.+\}\{x\}$/` accepts `currentColor`. |
| D5 | A cell function may return a TeX string, `null`/`''` (empty cell) or `{ text: 'plain prose' }`. | Every string is TeX; prose passed as TeX renders as squashed italics (seen in the prototype: "halvetheangle"). `{ text }` renders with `textContent` and no KaTeX. |
| D6 | Render policy: the first `update()` renders synchronously; later ones coalesce to one render per animation frame, adaptively throttled; while updates stream in (< 200 ms apart) cells render without the MathML half, and 220 ms after the last update one refine pass re-renders them with MathML. | Measured: MathML doubles layout cost. See section 8. |
| D7 | Narrow (stacked) layout is decided by a viewport media query (max-width 560px) AND a `ResizeObserver` on the widget root (`data-narrow="true"` when its width is <= 560px). Not a container query. | `container-type: inline-size` gives the wrapper zero intrinsic width and collapses it inside any shrink-to-fit parent. The observer has no such pitfall. |
| D8 | Extra optional fields: row `native`, column `tint` and `short`, `columns` may be omitted (defaults to the Cartesian and polar pair), `explainer.flush()`, `explainer.stats`, `staircase.setPicked(k)`, `staircase.update(null)`. Extra pure exports are listed in section 4. | The "easy in Polar" badge is the on-screen form of assignment success criterion 2 ("say which address makes it easy and why"); the rest supports testing and the z = 0 case. |
| D9 | Shared TeX macros `\Re`, `\Im`, `\Arg`, `\cj{z}` are predefined in `katex.js`. | KaTeX's built-in `\Re` and `\Im` render fraktur capitals, wrong for this course; `\Arg` does not exist. |
| D10 | The verification fixture route is the unknown token `widgets-fixture`; the interaction script builds its own fixtures in the page. Unit tests are run by file name, not by `npm test`. | This goal has no route of its own. `npm test` (`node --test tests/unit/`) FAILS on the installed Node 22.22 ("Cannot find module .../tests/unit"), even before this goal; see section 10. |

---

## 1. Goal, story thread, problems

**Goal.** Three shared widgets that every station composes:

1. `katex.js` renders TeX safely and tints pieces with the theme tokens, so a formula can carry the two-address colour code.
2. `explainer.js` renders the two-column live numeric explainer: the same quantity worked in Cartesian (left, `--cart`)
   and polar (right, `--polar`), numbers updating as the student drags, closed by a "same point" row that says whether
   the two addresses agree.
3. `staircase.js` renders the arg / Arg staircase as a list: the whole set `arg z = { Arg z + 2*pi*k }` as ghost steps, the
   home window `(seam, seam + 2*pi]` as a shaded band, and the one step inside it highlighted as `Arg z`.

**Story thread carried.**

- Thread 1 as a component. The explainer is where "the dot never changes; only the address does" is shown in numbers: the
  Cartesian column and the polar column are two descriptions of one result, the footer says `same point: agree`, and the
  optional badge `easy in Polar` / `easy in Cartesian` on a row says which address the question is native to
  ("pick the address where the question is native, do it there, translate back").
- Thread 2 as a component. The staircase is the student's own question made literal: the point z is not in the widget at
  all (it lives on the plane), `arg z` is the ghosted list of every name, `Arg z` is the single bold, shaded home step.
  Move the seam (`setSeam`) and a different step becomes home; cross the seam and the widget says, in words,
  "Arg z dropped by 2pi. The set arg z did not move." That sentence is the difference between Arg and arg.

**How it shows on screen.** Two coloured columns with hue-coded headings and stripes (blue family for Cartesian, orange family
for polar in the default theme tokens), an `--ok`-coloured `agree` verdict in the footer, a shaded home row with filled marker and
`Arg z = 2pi/3` in bold beside four ghost rows with exact angles (`2pi/3 + 2pi = 8pi/3`) and decimals.

**Review problems and topics covered** (`assignment_refs`; each is worked in section 6 and is a fixture in the tests):

| Problem or topic | What these widgets show |
|---|---|
| 1.1.1 z1 z2 and z1/z2 | explainer rows product and quotient, Cartesian column vs polar column, footer `same point` |
| 1.3.1 polar and exponential form of -1 + i sqrt3, Arg z | staircase of 2pi/3: `-10pi/3, -4pi/3, 2pi/3, 8pi/3, 14pi/3`, home = 2pi/3; explainer rows x, y, r, theta |
| 1.3.2 (sqrt3 + i)^10 | staircase wraps 10pi/6 = 5pi/3 onto the home step -pi/3; explainer rows r^n, n theta, wrapped, result |
| 1.4.1 5th roots of unity | staircase of c = 1 (`0, 2pi, ..., 10pi`, k = 0..5) which the station divides by 5; explainer rows per root |
| 2.1.1 z^2 + iz as u + iv | explainer rows expand, u, v in both addresses, both columns agree at three test points |
| 2.2.2 principal (2i)^(1/2) | staircase shows Arg(2i) = pi/2 as the only home step and 5pi/2 as the other name; explainer with a third "As a motion" column |
| 2.4.1 branch of z^(1/3) continuous on the negative real axis | `setSeam(0)`: window (0, 2pi], the crossing of the negative real axis is continuous (3.141 then 3.143, no jump); principal seam jumps |
| 3.2.1 e^x(cos y + i sin y) entire, f' | explainer with custom columns "along dx" and "along i dy" whose limits agree (`1.149 + 1.183i`) |
| T1.1, T1.3, T2.1, T2.2, T2.4 | the numeric explainer and the arg / Arg staircase are the shared vocabulary of these topics |

---

## 2. UX

These are components, not stations: they have almost no controls. The only interactive element is the staircase step
button, and only when `onPick` is given. The explainer is read-only text that the station updates while the student drags
something else. Stations own the page layout; the widgets fill the width of whatever block they are placed in.

**Placement contract.** The host element should be a block-level box (a normal block, a grid cell, or a flex item with flex-grow or flex-basis); the widgets fill its width and never set a width on the host. A shrink-to-fit host (inline-block) works but sizes to its content.

### 2.1 Explainer wireframes

Desktop / wide container (> 560px), default two columns, `title` given, `same` given, row 1 has `native: 'polar'`:

```
+--------------------------------------------------------------------------------+
| Multiply z1 by z2                                                  <caption>   |
+-------------+-------------------------------+----------------------------------+
|  (Quantity) | Cartesian (slide)   [--cart]  | Polar (spin-and-stretch) [--polar]|
|             |===============================|==================================|
| z1 z2       |# 5 + 14i                      |# 14.866 e^(i 1.228)   (washed)   |
| easy in     |#                              |#                                  |
| Polar       |#                              |#                                  |
+-------------+-------------------------------+----------------------------------+
| z1 + z2     |# 2 + 2i      (washed)         |# 2.828 e^(i 0.785)               |
| easy in     |#                              |#                                  |
| Cartesian   |#                              |#                                  |
+-------------+-------------------------------+----------------------------------+
| same point: |# 5 + 14i                      |# 14.866 e^(i 1.228)              |
| (o) agree   |#                              |#                                  |
+-------------+-------------------------------+----------------------------------+
   # = 3px stripe in the column tone      (o) = filled disc, --ok (agree) / square, --warn (differ)
```

Third column present (`columns` has a third entry, tone `--output`): three equal columns after the 7.5rem row-label column.

> Superseded in residue cleanup: the row-label column is now 8rem (it was 7.5rem), so "not checked" is no longer 6 px from the divider.

Phone / narrow container (<= 560px): columns stack, each cell carries its column heading above it; the `thead` stays in the
DOM, visually hidden:

```
+---------------------------------+
| Multiply z1 by z2               |
+---------------------------------+
| z1 z2                           |
| easy in Polar                   |
|# Cartesian (slide)              |
|# 5 + 14i                        |
|# Polar (spin-and-stretch)       |   <- washed because this row is native to polar
|# 14.866 e^(i 1.228)             |
+---------------------------------+
| z1 + z2                         |
| easy in Cartesian               |
|# Cartesian (slide)  (washed)    |
|# 2 + 2i                         |
|# Polar (spin-and-stretch)       |
|# 2.828 e^(i 0.785)              |
+---------------------------------+
| same point: (o) agree           |
|# Cartesian (slide)              |
|# 5 + 14i                        |
|# Polar (spin-and-stretch)       |
|# 14.866 e^(i 1.228)             |
+---------------------------------+
```

**Controls and ids.** The explainer has no controls. Element ids (all stable, derived from `spec.id`, called `ID` below):

| Element | id / selector | Notes |
|---|---|---|
| root | `div.explainer-wrap[data-explainer="ID"]` | child of the container passed in; `data-narrow="true"` when stacked |
| table | `#ID-table` (`table.explainer`, `role="table"`) | `data-state="idle"` until the first render |
| title | `caption.ex-title` | only when `spec.title` is given, else the table gets `aria-label="Cartesian and polar working"` |
| header cells | `thead th[data-col="KEY"]` | colour `var(--tone)`; plus a visually hidden corner header `Quantity` |
| row | `tr.ex-row[data-row="ROWID"]` | no id on the row |
| row label | `th.ex-rowlabel` with `span.ex-label` and `span.ex-native` | badge text `easy in Polar`, hidden unless `row.native` resolves |
| cell | `#ID-ROWID-KEY` (`td.ex-cell`) | `data-col`, `data-heading`, `data-native="true|false"`, `data-tex` (the TeX last rendered; empty for empty / text / error cells) |
| footer row | `#ID-same` (`tr.ex-same[data-agree="true|false|"]`) | contains the text `same point: agree`, `same point: differ` or `same point: not checked` |
| footer cells | `#ID-same-KEY` | present only when `spec.same` is given |

Pointer, touch and keyboard: none needed. Text is selectable. A cell whose content is wider than the cell wraps (KaTeX inline
mode wraps at binary operators and relations; `overflow-wrap: anywhere` on the cell is the safety net).

**States.**

| State | What the student sees |
|---|---|
| Idle (created, no `update` yet) | rows and headings visible, every cell shows `…` (an ellipsis) in muted text; `data-state="idle"` |
| Live | cells show TeX; changed cells re-render, unchanged cells are untouched |
| Empty cell (function returns `null`, `false` or `''`) | an em dash `—`, muted, class `is-empty`; use it for "not applicable here" |
| Error: a row function throws | the cell shows `n/a` in the error colour (class `tex-error`, `title="Could not compute: <message>"`); one `console.error` per distinct row, column and message; the rest of the table still works |
| Error: bad TeX or KaTeX missing | the cell shows the TeX source in monospace in the error colour (class `tex-error`, `title` = the KaTeX message when there is one); never an exception |
| Footer without a verdict | `same(state)` threw, returned a non-object, or `agree` is not a boolean: label `same point: not checked`, neutral grey disc, cells empty or `n/a` |
| Destroyed | the DOM is removed; every method becomes a no-op |

### 2.2 Staircase wireframes

Same on desktop and phone (it is a narrow list; the host decides the width, 420px in the tests). Default `kMin = -2`, `kMax = 2`,
`seam = -pi`, `onPick` given, `update(2pi/3)`:

```
arg z = { 2pi/3 + 2pi*k : k is any integer }                      <- #ID-set    (muted)
Arg z = 2.094 (2pi/3)                                              <- #ID-arg    (bold)
Shaded step: the home window (-pi, pi]. Arg z is the step inside it.   <- #ID-window (muted)
+--------------------------------------------------------------+
|                            :                                  |  (decorative ellipsis)
|  o   2pi/3 + 4pi = 14pi/3                          ~ 14.661  |  #ID-k2   ghost
|  o   2pi/3 + 2pi = 8pi/3                            ~ 8.378  |  #ID-k1   ghost (this row picked: ringed in --polar)
|##@   Arg z = 2pi/3                                  ~ 2.094  |  #ID-k0   home: shaded band, filled larger marker, bold
|  o   2pi/3 - 2pi = -4pi/3                          ~ -4.189  |  #ID-k-1
|  o   2pi/3 - 4pi = -10pi/3                        ~ -10.472  |  #ID-k-2
|                            :                                  |
+--------------------------------------------------------------+
Seam crossed: Arg z dropped by 2pi. The set arg z did not move.      <- #ID-note (appears only after a crossing, clears after 3.5 s)
```

(`~` is drawn as the character U+2248 by CSS; `##` is the 4px polar bar at the left of the band; `:` is U+22EE.)

Rows run from the highest step (top) to the lowest (bottom). The band is positioned by `top = home-index * row height`; the home
row is always `k = 0`, which is row index `kMax` counting from the top, so `--home-index = kMax`.

**Controls and ids** (`ID` = `options.id`; ARCHITECTURE 3.8 fixes the `li` ids, `data-k`, `is-home` and `#ID-arg`):

| Element | id / selector | Behaviour |
|---|---|---|
| list | `ol.staircase#ID-list`, `aria-label="Names of the angle arg z"` | one `li` per step |
| step | `li#ID-k<k>` (`#ID-k-2`, `#ID-k0`, `#ID-k1`), `data-k="<k>"` | class `is-home` on k = 0 (`aria-current="step"`), `is-picked` on the picked step, `is-empty` in the z = 0 state |
| step button | `#ID-k<k> button.stair-row`, only when `onPick` is a function | click, tap, Enter or Space: marks the step picked (`aria-pressed="true"`, class `is-picked`), then calls `onPick(k)` with the integer k. Clicking again calls `onPick(k)` again; it never toggles off. |
| band | `div.staircase-home[data-window="(-pi, pi]"]`, `aria-hidden` | shaded home window, sits exactly behind the home row |
| set line | `p#ID-set` | the set, e.g. `arg z = { 2pi/3 + 2pi*k : k is any integer }` |
| Arg readout | `p#ID-arg` | text, e.g. `Arg z = 2.094 (2pi/3)` |
| legend | `p#ID-window` | names the window and which step is Arg |
| note | `p#ID-note`, `aria-live="polite"` | the seam-crossing sentence |
| root | `div.staircase-wrap[data-stairs="ID"]` | data hooks: `data-jumps`, `data-last-jump` (+1 or -1), `data-seam`, `data-window`, `data-home-k`, `data-arg`, `data-home-visible`, `data-dense` |

Pointer and touch: each step is one full-width button, 40px high (32px when more than 8 rows), well above the WCAG 2.2 minimum of 24px.
Keyboard (only with `onPick`; roving tabindex, exactly one step is a tab stop, default the home row): `ArrowUp` moves focus to the next
higher step, `ArrowDown` to the next lower, `Home` to the highest, `End` to the lowest, `Enter` / `Space` picks. Focus is a 3px
`--focus` ring drawn inside the row. The picked mark is a 2px inset `--polar` ring (`box-shadow`, not `outline`), so the outline belongs to focus alone; on a
focused, picked row the focus ring sits 2px further in, so both the picked mark and the focus ring are visible. Without `onPick` the rows are plain `div`s and are not focusable.

**States.**

| State | What the student sees |
|---|---|
| Normal | as above |
| z = 0 (call `update(null)`, or any non-number) | `#ID-set` "arg z is not defined here"; `#ID-arg` "Arg z = undefined"; `#ID-window` "The point 0 has no angle. Every direction reaches it, so arg z is not defined."; every row shows an em dash, no home row, band hidden (`data-home-visible="false"`; it returns on the next number) |
| Home step outside `kMin..kMax` (for example `kMin = 1`) | no row is home; band hidden (`data-home-visible="false"`); `#ID-arg` still correct |
| Seam moved (`setSeam`) | the legend text and the band's `data-window` change, and the rows re-anchor: the band stays on k = 0 (rows are anchored to the home step, D3), so nothing slides; what changes is which angle the labels say. The band has no transition. |
| Seam crossed by `update` | note sentence, brief outline pulse on the Arg line (none under reduced motion), `data-jumps` + 1 |
| Destroyed | DOM removed; methods become no-ops |

### 2.3 Copy (exact strings; plain, direct, ASCII minus in generated numbers)

Explainer: default headings `Cartesian (slide)` and `Polar (spin-and-stretch)`; example third heading `As a motion`.
Row badge `easy in ` + the column's short name (`Cartesian`, `Polar`; the short name is the heading without its parenthesis, or `column.short`).
Footer `same point: agree`, `same point: differ`, `same point: not checked`. Empty `—`. Idle `…`. Error `n/a`.
Hidden corner header `Quantity`. Fallback table label `Cartesian and polar working`.

Staircase: see the wireframe above and the grammar in section 5.3. Jump note `Seam crossed: Arg z dropped by 2π. The set arg z did not move.`
(counterclockwise crossing) or `Seam crossed: Arg z rose by 2π. The set arg z did not move.` (clockwise). `Arg z` / `arg z` follow the `label` option
(`arg w` gives `Arg w`; the first `arg` of the label is capitalised, other labels are used unchanged).
Step button accessible name: `step k = 1: 2π/3 + 2π = 8π/3`; for the home step `step k = 0: Arg z = 2π/3`.

---

## 3. Visual encoding (both themes)

Colours come only from the tokens in `css/theme.css` (ARCHITECTURE 6). In both themes the same CSS applies because every colour is a
`var(--token)`; the shell redefines the tokens for dark. The only hex strings in the three files are the canvas probe sentinel in
`katex.js` and regex literals; every `var()` fallback is a system colour keyword (`Canvas`, `CanvasText`, `GrayText`, `Highlight`) or `currentColor`, never a literal.

| Mark | Token | Where |
|---|---|---|
| Cartesian column: heading text, heading underline, cell stripe, wash on native cells, `easy in Cartesian` badge | `--cart` | explainer |
| Polar column: same marks | `--polar` | explainer; also the staircase home band, bar, marker and `Arg z =` prefix |
| Third column ("as a motion"), when given | `--output` (station's choice via `tone`) | explainer |
| Tinted pieces inside a formula | `--cart`, `--polar`, `--input`, `--output` | `cart()`, `polar()`, `input()`, `output()` in `katex.js`, baked as hex at render time |
| Surfaces | `--surface` (cells, list), `--surface-2` (caption, headings, footer), `--border` | both widgets |
| Text | `--text`, `--text-muted` (row labels, ghost rows, decimals) | both widgets |
| Verdict | `--ok` agree (filled disc), `--warn` differ (filled square); both also carry the words | explainer footer |
| Errors | `--danger` (class `tex-error`, monospace) | explainer cells |
| Focus ring | `--focus` (3px outline, inside the row) | staircase buttons |
| Picked step | `--polar` 2px inset ring (`box-shadow`, never `outline`) | staircase |
| Ghost steps | marker at `opacity: var(--ghost-alpha)`, text `--text-muted` | staircase |
| Fonts and shape | `--font`, `--font-mono`, `--radius`, `--space-1`, `--space-2`, `--space-3` | both |

**Cartesian vs polar code.** A Cartesian column never uses `--polar` and vice versa. Inside a mixed formula (for example
`x = r cos(theta)`) the station tints `x` with `cart()` and `r`, `theta` with `polar()`; the explainer never recolours the contents
of a cell unless the column asks for it (`tint: true` tints the whole body cell, used for plain-text columns; footer cells are always tinted by their column tone).

**arg as a set, Arg highlighted.** In the staircase: all steps of the set are drawn (ghost: faint marker, muted text), the home window is the shaded
band, and exactly one step is the home step: bold, `--text`, filled enlarged marker, 4px `--polar` bar, `Arg z =` prefix in `--polar`. The word `Arg` appears
only on that row, in `#ID-arg`, in the legend and in the jump note; the word `arg` appears only in the set line, the legend and the note.

**Input vs output.** Not applicable to these widgets (no strokes). `--input` is available through `input()`; `--output` is the default tone of a third explainer column.

**Time colouring.** Not applicable (no curves). `--t0` and `--t1` are not used.

**Contrast.** Tone-coloured text is bold and at least 0.72rem; it needs 4.5:1 against `--surface` and `--surface-2` in both themes. That is a property of the tokens (shell goal). The interaction script logs the ratio (advisory, not a gate) and prints `WARNING` below 4.5:1. Meaning is never carried by colour alone: headings say Cartesian / Polar, the badge says `easy in Polar`, the verdict says `agree` / `differ`, the home step is also bold and prefixed `Arg z =`.

Light and dark have no separate rules. Colours that are baked (TeX tints) are re-read on theme change, see 5.2 step 17.

Verbatim styles (injected once per page as `<style data-for="explainer">` and `<style data-for="staircase">`):

```js
const stack = (p) => `
  ${p} .explainer, ${p} .explainer tbody, ${p} .explainer tfoot, ${p} .explainer tr, ${p} .explainer th, ${p} .explainer td { display: block; }
  ${p} .explainer caption { display: block; width: 100%; }
  ${p} .explainer thead { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  ${p} .explainer thead tr { display: block; }
  ${p} .explainer thead th { display: inline; }
  ${p} .explainer .ex-rowlabel { width: auto; padding-bottom: 0; }
  ${p} .explainer tr.ex-row { border-top: 1px solid var(--border, GrayText); }
  ${p} .explainer tr.ex-row > * { border-top: 0; }
  ${p} .explainer td.ex-cell::before { content: attr(data-heading); display: block; margin-bottom: .125rem; font-family: var(--font, inherit); font-size: .72rem; font-weight: 700; letter-spacing: .03em; color: var(--ex-tone, inherit); }
  ${p} .explainer tfoot tr { border-top: 2px solid var(--border, GrayText); }
  ${p} .explainer tfoot > tr > * { border-top: 0; }
  ${p} .explainer .ex-same-label { display: inline; }
  ${p} .explainer tfoot th { padding-right: var(--space-3, .75rem); }
`;

const CSS = `
.explainer-wrap { position: relative; max-width: 100%; background: var(--surface, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 8px); overflow: hidden; }
.explainer { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0;
  font-family: var(--font, inherit); font-size: 1rem; color: var(--text, CanvasText); }
.explainer caption { caption-side: top; text-align: left; font-weight: 700; padding: var(--space-2, .5rem) var(--space-3, .75rem);
  background: var(--surface-2, Canvas); border-bottom: 1px solid var(--border, GrayText); }
.explainer th, .explainer td { padding: var(--space-2, .5rem) var(--space-3, .75rem); text-align: left; vertical-align: top;
  border-top: 1px solid var(--border, GrayText); min-width: 0; overflow-wrap: anywhere; }
.explainer thead th { border-top: 0; font-size: .85rem; font-weight: 700; letter-spacing: .02em; color: var(--ex-tone, var(--text, CanvasText));
  border-bottom: 3px solid var(--ex-tone, var(--border, GrayText)); background: var(--surface-2, Canvas); }
.explainer thead th.ex-corner { width: 7.5rem; border-bottom-color: var(--border, GrayText); color: transparent; }
.explainer .ex-rowlabel { width: 7.5rem; font-size: .9rem; font-weight: 600; color: var(--text-muted, GrayText); }
.explainer .ex-native { display: block; margin-top: .125rem; font-size: .72rem; font-weight: 700; letter-spacing: .03em; color: var(--ex-tone, var(--text, CanvasText)); }
.explainer .ex-native[hidden] { display: none; }
.explainer td.ex-cell { position: relative; isolation: isolate; box-shadow: inset 3px 0 0 var(--ex-tone, var(--border, GrayText)); }
.explainer td.ex-cell::after { content: ''; position: absolute; inset: 0; z-index: -1; background: var(--ex-tone, transparent); opacity: 0; pointer-events: none; }
.explainer td.ex-cell[data-native="true"]::after { opacity: .09; }
.explainer td.ex-cell[data-native="true"] { font-weight: 600; }
.explainer td.ex-cell.ex-tinted, .explainer tfoot td.ex-cell { color: var(--ex-tone, inherit); }
.explainer td.ex-cell.is-empty { color: var(--text-muted, GrayText); }
.explainer td.tex-error { color: var(--danger, CanvasText); font-family: var(--font-mono, monospace); font-size: .85rem; }
.explainer .katex { font-size: 1.05em; }
.explainer[data-state="idle"] td.ex-cell { color: var(--text-muted, GrayText); }
.explainer tfoot th, .explainer tfoot td { background: var(--surface-2, Canvas); border-top: 2px solid var(--border, GrayText); }
.explainer tfoot th { padding-right: var(--space-1, .25rem); }
.explainer .ex-same-label { display: block; }
.explainer .ex-same-verdict { display: inline-flex; align-items: center; gap: .25rem; font-weight: 700; white-space: nowrap; }
.explainer .ex-same-verdict::before { content: ''; width: .65rem; height: .65rem; border-radius: 50%; background: var(--text-muted, GrayText); flex: none; }
.explainer tr.ex-same[data-agree="true"] .ex-same-verdict { color: var(--ok, inherit); }
.explainer tr.ex-same[data-agree="true"] .ex-same-verdict::before { background: var(--ok, currentColor); }
.explainer tr.ex-same[data-agree="false"] .ex-same-verdict { color: var(--warn, inherit); }
.explainer tr.ex-same[data-agree="false"] .ex-same-verdict::before { background: var(--warn, currentColor); border-radius: 2px; }
@media (max-width: 560px) { ${stack('')} }
${stack('.explainer-wrap[data-narrow="true"]')}
`;
```

```js
const CSS = `
.staircase-wrap { --row-h: 2.5rem; font-family: var(--font, inherit); color: var(--text, CanvasText); }
.staircase-wrap[data-dense="true"] { --row-h: 2rem; }
.staircase-wrap .stair-set { margin: 0 0 var(--space-1, .25rem); font-size: .9rem; color: var(--text-muted, GrayText); overflow-wrap: anywhere; }
.staircase-wrap .stair-arg { margin: 0 0 var(--space-2, .5rem); font-weight: 700; border-radius: 4px; }
.staircase-wrap .stair-window { margin: 0 0 var(--space-2, .5rem); font-size: .85rem; color: var(--text-muted, GrayText); }
.staircase-wrap .stair-body { background: var(--surface, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 8px); padding: var(--space-1, .25rem) 0; overflow: hidden; }
.staircase-wrap .stair-more { height: 1rem; line-height: 1; text-align: center; font-size: .9rem; color: var(--text-muted, GrayText); }
.staircase-wrap .stair-list { position: relative; }
.staircase-wrap .staircase-home { position: absolute; left: 0; right: 0; top: calc(var(--home-index, 0) * var(--row-h)); height: var(--row-h); pointer-events: none; z-index: 0; }
.staircase-wrap .staircase-home::before { content: ''; position: absolute; inset: 0; background: var(--polar, currentColor); opacity: .12; }
.staircase-wrap .staircase-home::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--polar, currentColor); }
.staircase-wrap[data-home-visible="false"] .staircase-home { display: none; }
.staircase { list-style: none; margin: 0; padding: 0; position: relative; z-index: 1; }
.staircase li { height: var(--row-h); margin: 0; padding: 0; }
.staircase .stair-row { box-sizing: border-box; display: flex; align-items: center; gap: .6rem; width: 100%; height: 100%; margin: 0; padding: 0 .9rem; border: 0; background: none;
  font: inherit; color: var(--text-muted, GrayText); text-align: left; white-space: nowrap; overflow: hidden; }
.staircase button.stair-row { cursor: pointer; }
.staircase button.stair-row:hover { background: var(--surface-2, transparent); }
.staircase button.stair-row:focus-visible { outline: 3px solid var(--focus, Highlight); outline-offset: -3px; border-radius: 4px; }
.staircase li.is-picked button.stair-row:focus-visible { outline-offset: -5px; }
.staircase .stair-mark { flex: none; width: .7rem; height: .7rem; border-radius: 50%; background: var(--polar, currentColor); opacity: var(--ghost-alpha, .45); }
.staircase .stair-text { overflow: hidden; text-overflow: ellipsis; }
.staircase .stair-dec { margin-left: auto; flex: none; font-family: var(--font-mono, monospace); font-size: .8rem; color: var(--text-muted, GrayText); }
.staircase .stair-dec::before { content: '\\2248 '; }
.staircase li.is-home .stair-row { color: var(--text, CanvasText); font-weight: 700; }
.staircase li.is-home .stair-mark { opacity: 1; width: .9rem; height: .9rem; }
.staircase li.is-home .stair-prefix { color: var(--polar, inherit); }
.staircase li.is-picked .stair-row { box-shadow: inset 0 0 0 2px var(--polar, currentColor); border-radius: 4px; }
.staircase li.is-empty .stair-row { justify-content: center; }
.staircase li.is-empty .stair-mark, .staircase li.is-empty .stair-dec { display: none; }
.staircase-wrap .stair-note { margin: var(--space-2, .5rem) 0 0; min-height: 1.4em; font-size: .9rem; color: var(--text, CanvasText); }
.staircase-wrap.is-jump .stair-arg { animation: stair-pulse .9s ease-out 1; }
@keyframes stair-pulse { from { box-shadow: 0 0 0 4px var(--polar, currentColor); } to { box-shadow: 0 0 0 4px transparent; } }
@media (prefers-reduced-motion: reduce) {
  .staircase-wrap.is-jump .stair-arg { animation: none; }
}
`;
```

---

## 4. Module API

All three modules: ES modules, relative imports only, no top-level DOM or `globalThis.katex` access (they must import cleanly in Node), no network.

### 4.1 `js/core/katex.js` (imports nothing)

```js
export function tex(el, src, { display = false, mathml = true } = {})   // ARCHITECTURE 3.6 (+ mathml)
export function texToHtml(src, { display = false, mathml = true } = {}) → string
export function tint(src, token) → string        // `\textcolor{<hex>}{src}`
export const cart, polar, input, output          // (src) => tint(src, '--cart' | '--polar' | '--input' | '--output')
// additive extras
export function texColor(tokenOrColor) → string  // '#rrggbb' | '#rgb' | a colour name | 'currentColor'; never throws
export function escapeHtml(s) → string
export function clearTexCache()                  // tests
```

Contract:
- `tex(el, src)` replaces the children of `el` with the rendered formula (`innerHTML`). It first removes class `tex-error` and the `title` attribute. On a TeX error, or when KaTeX is missing, it sets `el.textContent = src`, adds class `tex-error` (plus `title` = the KaTeX message when there is one). An empty `src` sets `textContent = ''`. It never throws, tolerates `el == null`, and tolerates a fake element that only has `textContent` and either `classList` or `className` (acceptance A2 uses a fake element).
- `texToHtml(src)` returns `''` for an empty or nullish `src`; the escaped text (no markup) when KaTeX is missing; `<span class="tex-error" title="...">escaped src</span>` on a TeX error; otherwise the KaTeX HTML (`class="katex"`; `class="katex-display"` when `display`). `mathml: false` renders `output: 'html'` (no `.katex-mathml` half).
- `tint(src, token)` returns `` `\textcolor{${texColor(token)}}{${src}}` ``. Called at render time (inside a row function), never cached at mount, so a theme change recolours it.
- KaTeX is read lazily from `globalThis.katex` on every call. Options passed: `throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000, macros: copy of MACROS`.
- Macros: `\Re` -> `\operatorname{Re}`, `\Im` -> `\operatorname{Im}`, `\Arg` -> `\operatorname{Arg}`, `\cj` -> `\overline{#1}`.
- An LRU cache (300 entries, key = display flag + mathml flag + source) avoids re-rendering identical strings. Colours are inside the source, so a theme change produces new keys; nothing goes stale.

### 4.2 `js/core/explainer.js` (imports `{ tex }` from `./katex.js`)

```js
export function createExplainer(container: Element, spec) → Explainer
// spec
{ id: string,                       // required, non-empty; sanitized with /[^A-Za-z0-9_-]/g -> '-'
  title?: string,                   // table caption
  columns?: Column[],               // 1 to 3; default [cart, polar] below
  rows: Row[],
  same?: (state) => { [columnKey]: tex | {text} | null, agree: boolean } }
// Column
{ key: string, heading: string, tone: '--token',     // tone must match /^--[A-Za-z0-9_-]+$/ else '--text'
  tint?: boolean = false,                            // true: body cells use the tone as text colour
  short?: string }                                   // name used in "easy in <short>"; default: heading without its trailing "(...)"
// default columns
[ { key: 'cart',  heading: 'Cartesian (slide)',          tone: '--cart'  },
  { key: 'polar', heading: 'Polar (spin-and-stretch)',    tone: '--polar' } ]
// Row
{ id: string,                       // sanitized like the spec id; duplicates are skipped with console.warn
  label: string,                    // plain text, unicode subscripts are fine
  [columnKey]: (state) => tex | { text: string } | null,    // one function per column (a plain string is also accepted)
  native?: columnKey | ((state) => columnKey | null) }      // which address this row is native to
// Explainer
{ el: container,
  update(state),                    // never throws
  flush(),                          // render now at full quality with the latest state (cancels pending work)
  setRows(rows),                    // replace all rows; re-renders at once if a state exists
  destroy(),                        // idempotent
  stats: { renders, refines, cellWrites } }   // monotone counters, for tests
// additive pure exports (unit-tested)
export function sanitizeId(s) → string
export function shortHeading(heading) → string
```

`createExplainer` throws `TypeError` only for programmer errors (no container element, missing `spec.id`); the router's under-construction panel
catches it. Everything after creation is exception-free.

Station usage pattern (the rules below are binding for stations; they are listed in section 10):

```js
const ex = createExplainer(host, { id: 'addresses-ex', title: 'Where is z?', rows: [
  { id: 'x', label: 'x', native: 'cart',
    cart:  (s) => `${cart('x')} = ${cart(num(s.z.re))}`,
    polar: (s) => `${cart('x')} = ${polar('r')}\\cos ${polar('\\theta')} = ${polar(num(s.r))}\\cdot ${polar(num(Math.cos(s.theta)))}` },
  /* ... */ ],
  same: (s) => ({ cart: cart(texCart(s.z)), polar: polar(texPolar(s.z)), agree: Math.abs(s.check) < 1e-9 }) });
dragHandle.onDrag = (z) => ex.update(computeState(z));    // call as often as you like; the explainer coalesces
unmount = () => ex.destroy();
```

Lifecycle: created inside a station's `mount`, destroyed in `unmount`. `destroy()` cancels the pending rAF and the refine timer, removes the
`themechange` listener, the `prefers-color-scheme` media listener, the `MutationObserver` on `<html data-theme>` and the `ResizeObserver`, and removes the widget root from the container.

Events consumed: `document` `themechange` (from `theme.js`), `matchMedia('(prefers-color-scheme: dark)')` `change`, attribute `data-theme` on `<html>` (so the widget also reacts if some code sets the attribute directly), `ResizeObserver` on its root. Events emitted: none.

### 4.3 `js/core/staircase.js` (imports nothing)

```js
export function createStaircase(container: Element, { id, kMin = -2, kMax = 2, seam = -Math.PI, label = 'arg z', onPick = null }) → Staircase
// Staircase
{ el: container,
  update(theta: number | null),     // any representative; null or non-finite = the point 0 (no angle)
  setSeam(seam: number),            // window becomes (seam, seam + 2*pi]; ignores non-finite
  setLabel(label: string),
  setPicked(k: number | null),      // highlight a step without calling onPick
  destroy() }                       // idempotent
// pure exports (ARCHITECTURE 3.8 + helpers; all unit-tested)
export function argSteps(theta, kMin = -2, kMax = 2) → [{ k, theta: theta + 2*pi*k }]        // [] when theta is not finite or kMin > kMax
export function homeStep(theta, seam = -Math.PI) → { k, theta }                                 // theta' in (seam, seam + 2pi]; k = turns added to theta to reach it
export function exactPi(x) → string | null                  // '2π/3', '-π/3', 'π', '0', '14π/3'; null when x is not p·π/q (q <= 12, |p| <= 240) within 1e-9
export function fmtDec(x, digits = 3) → string              // 3 decimals, trailing zeros trimmed, ASCII minus, '-0' -> '0'
export function stepText(home, k) → { text, dec, total, full } // one list row; full = text plus "= decimal" when text leaves the total out (accessible name)
export function argReadout(label, home) → string            // 'Arg z = 2.094 (2π/3)'
export function windowText(seam) → string                   // '(-π, π]'
export function homeLabelFor(label) → string                // 'arg z' -> 'Arg z'
export function seamJump(prevHome, nextHome) → -1 | 0 | 1   // +1: counterclockwise crossing; -1: clockwise
```

`createStaircase` throws `TypeError` for no container element or empty `id`. `kMin > kMax` are swapped; more than 25 rows are cut to 25 (console.warn).
Row ids are `${id}-k${k}` (negative k gives `-k-2`). Lifecycle: `destroy()` clears the jump and note timers and removes the root.
Callbacks: `onPick(k)` only, after the picked state is updated. No events are emitted and none are consumed (the staircase is theme-independent CSS; no listeners on `document`).

---

## 5. Algorithms

### 5.1 `katex.js`

1. `getKatex()`: `const k = globalThis.katex; return k && typeof k.renderToString === 'function' ? k : null`.
2. `renderOrThrow(src, display, mathml)` (precondition: KaTeX present, `src` non-empty): `key = (display ? 'D' : 'I') + (mathml ? 'M' : 'H') + src`.
   On a cache hit, delete and re-insert the key (LRU) and return it. Otherwise
   `html = katex.renderToString(src, { displayMode: !!display, throwOnError: true, strict: 'ignore', trust: false, output: mathml ? 'htmlAndMathml' : 'html', macros: {...MACROS}, maxExpand: 1000 })`,
   store, and if the map has more than 300 entries delete the oldest key. A KaTeX parse error propagates (not cached).
3. `texToHtml`: normalise `src` (`null` -> `''`); `''` -> `''`; no KaTeX -> `escapeHtml(src)`; try `renderOrThrow`; on error return
   `<span class="tex-error" title="ESC(message)">ESC(src)</span>`.
4. `tex(el, src, opts)`: `el == null` -> return; remove class `tex-error` (via `classList.remove` when present, else edit `className`);
   remove `title` when `removeAttribute` exists; empty `src` -> `el.textContent = ''`, return; no KaTeX -> `el.textContent = src`, add `tex-error`, return;
   try `el.innerHTML = renderOrThrow(...)`; on error `el.textContent = src`, add `tex-error`, set `title` to the message when `setAttribute` exists.
5. Colour (verbatim; the regexes and the probe are load-bearing):

```js
// module-level declarations used below
const MACROS = {
  '\\Re': '\\operatorname{Re}',
  '\\Im': '\\operatorname{Im}',
  '\\Arg': '\\operatorname{Arg}',
  '\\cj': '\\overline{#1}',
};
const CACHE_MAX = 300;
const htmlCache = new Map();   // key: D|I + M|H + src  -> html string (LRU by re-insertion)
const colorCache = new Map();  // raw css colour -> '#rrggbb' | 'currentColor'
let probeCtx = null;

// ---- colour tokens -> something KaTeX accepts (#rgb, #rrggbb or a bare colour name) ----------
const HEX_OK = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const NAME_OK = /^[a-z]+$/i;

function readToken(name) {
  try {
    if (typeof globalThis.getComputedStyle !== 'function') return '';
    const root = globalThis.document && globalThis.document.documentElement;
    return String(globalThis.getComputedStyle(root).getPropertyValue(name) || '').trim();
  } catch (e) { return ''; }
}
function toHex(raw) {
  if (colorCache.has(raw)) return colorCache.get(raw);
  let out = 'currentColor';
  try {
    const doc = globalThis.document;
    if (doc && typeof doc.createElement === 'function') {
      if (!probeCtx) probeCtx = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = '#010203';
      probeCtx.fillStyle = raw;
      if (probeCtx.fillStyle !== '#010203') {            // the assignment was accepted
        probeCtx.fillRect(0, 0, 1, 1);
        const d = probeCtx.getImageData(0, 0, 1, 1).data;
        if (d[3] > 0) out = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch (e) { /* keep currentColor */ }
  colorCache.set(raw, out);
  return out;
}
export function texColor(tokenOrColor) {
  const v = String(tokenOrColor == null ? '' : tokenOrColor).trim();
  const raw = v.startsWith('--') ? readToken(v) : v;
  if (!raw) return 'currentColor';
  if (HEX_OK.test(raw) || NAME_OK.test(raw)) return raw;
  return toHex(raw);
}
export function tint(src, token) { return `\\textcolor{${texColor(token)}}{${src}}`; }
export const cart = (src) => tint(src, '--cart');
export const polar = (src) => tint(src, '--polar');
export const input = (src) => tint(src, '--input');
export const output = (src) => tint(src, '--output');
```

   Resolution order for `texColor(x)`: empty -> `currentColor`; a token (starts with `--`) is read from `getComputedStyle(document.documentElement)`
   (any failure or an empty value -> `currentColor`); `#rgb`, `#rrggbb` and bare names pass through; everything else (rgb, hsl, oklch, color-mix, `#rrggbbaa`, `#rgba`) goes through the 1x1 canvas probe, which also drops alpha.
   The probe assigns a sentinel first so an invalid string is detected, and caches by raw string. In Node (no `document`, or no `getComputedStyle`) the result is `currentColor`, so `tint('x', '--cart')` is `\textcolor{currentColor}{x}` (valid for KaTeX, matches the A2 regex).
   Measured in Chromium: `rgb(37, 99, 235)` -> `#2563eb`; `#abcd` -> `#aabbcc`; `oklch(0.6 0.2 260)` -> `#2e79f5`; `color-mix(in srgb, red 50%, blue)` -> `#800080`; `light-dark(...)` is not understood by the test Chromium -> `currentColor`.

### 5.2 `explainer.js`

Constants: `STREAM_MS = 200`, `REFINE_MS = 220`, `MAX_GAP_MS = 100`, `NARROW_PX = 560`, EM_DASH `—`, ELLIPSIS `…`.

`createExplainer(container, spec)`:

1. Validate (`TypeError`); `ensureStyle()` (inject `<style data-for="explainer">` once: `document.head.querySelector('style[data-for="explainer"]')`, else create; no-op without `document`).
2. `id = sanitizeId(spec.id)`. Normalise columns: default pair when missing or empty; at most 3; `key = sanitizeId`, `heading = String`, `tone` validated, `tint = !!c.tint`, `short = c.short || shortHeading(heading)`.
3. Build static DOM: `div.explainer-wrap[data-explainer]` > `table.explainer#ID-table[role=table][data-state=idle]`; `caption.ex-title` if `title`, else `aria-label`;
   `thead[role=rowgroup]` > `tr[role=row]` > corner `th.ex-corner[scope=col][role=columnheader]` (text `Quantity`) + one `th[scope=col][role=columnheader][data-col]` per column with `style --ex-tone: var(<tone>)` and the heading text;
   `tbody[role=rowgroup]`; when `spec.same` is a function, `tfoot[role=rowgroup]` > `tr#ID-same.ex-same[role=row][data-agree=""]` > `th.ex-rowlabel[scope=row][role=rowheader]` containing `span.ex-same-label` ("same point: ") immediately followed by `span.ex-same-verdict` (so `textContent` reads `same point: agree`), then one `td#ID-same-KEY.ex-cell[data-col][data-heading][role=cell]` per column with `--ex-tone`.
   Explicit ARIA roles are required: the narrow layout sets `display: block` on table parts, which makes some browsers drop table semantics.
4. `buildRows(list)`: empty `tbody`, clear the cell, row and last-key maps. For each row (skip entries without an id): `rid = sanitizeId(row.id)`; duplicate -> `console.warn`, skip.
   Build `tr.ex-row[data-row=rid][role=row]` > `th.ex-rowlabel[scope=row][role=rowheader]` (`span.ex-label` = label text, `span.ex-native[hidden]`) and per column `td#ID-rid-KEY.ex-cell[data-col][data-heading][data-native=false][role=cell]` (+ class `ex-tinted` when `column.tint`), `--ex-tone` set, text `…`.
5. Narrow detection: `setNarrow(w)`: if `w > 0` set `wrap.dataset.narrow = String(w <= 560)`. Call it once synchronously with `wrap.clientWidth` (the content box, which is what the observer reports; the wrapper carries the 1px border) right after appending (no flash of the wrong layout), then observe `wrap` with a `ResizeObserver` (`contentRect.width`) when available.
6. Listeners: `document 'themechange'`, `matchMedia('(prefers-color-scheme: dark)')` `change`, `MutationObserver(html, attributes, attributeFilter ['data-theme'])`, all calling `onTheme`: if not destroyed and a state exists, `fast = false` then `schedule()`.
7. `evalCell(fn, state, who)`: `try { v = typeof fn === 'function' ? fn(state) : (typeof fn === 'string' ? fn : null) }`;
   `null`, `false` or `''` -> `['empty', '']`; an object with a string `.text` -> `['text', v.text]` (`''` -> empty); otherwise `['tex', String(v)]`.
   On an exception -> `['error', 'Could not compute: ' + message]`, and `console.error` once per `who + message` (`who = rowId/columnKey`; a per-explainer `Set`).
8. `writeCell(td, kind, payload)`: `key = kind === 'tex' ? payload + (fast ? '\0H' : '\0M') : kind + '\0' + payload`. If `lastKey.get(td) === key` return. Else store the key, `stats.cellWrites++`, remove `is-empty`, then:
   `empty` -> remove `tex-error` and `title`, `textContent = '—'`, add `is-empty`, `dataset.tex = ''`;
   `text` -> remove `tex-error` and `title`, `textContent = payload`, `dataset.tex = ''`;
   `error` -> `textContent = 'n/a'`, add `tex-error`, `title = payload`, `dataset.tex = ''`;
   `tex` -> `tex(td, payload, { display: false, mathml: !fast })`, `dataset.tex = payload`.
   Inline mode (never display mode) so formulas can wrap.
9. `render(kind)` (`kind` is `'tick'` or `'refine'`): clear the rAF handle; if destroyed return; `t0 = now()`; increment `stats.refines` for `'refine'`, else `stats.renders`; mark `rendered`; remove `data-state`.
   For each row and column: `writeCell(cell, ...evalCell(row[col.key], lastState, rid/colKey))`.
   Native flags: `nk = typeof row.native === 'function' ? row.native(state) : row.native` (exceptions -> `null`); not a column key -> `null`. When `nk` differs from the stored value: set `data-native` on every cell of the row (`"true"` only for the native column); show `span.ex-native` with text `easy in ` + `short` and `--ex-tone` of that column, or clear and hide it.
   Footer (when `same`): `res = same(state)` (exception -> failed, `console.error`); `obj` = object result or null; `agree = !failed && obj && obj.agree === true ? 'true' : (obj && obj.agree === false ? 'false' : '')`;
   verdict text `agree` / `differ` / `not checked`; update `data-agree` and the verdict text only when changed; each footer cell: failed -> `error` ('Could not compute the same-point row'), missing -> `empty`, else `tex` via `writeCell`.
   Finally `lastRenderEnd = now(); lastRenderMs = lastRenderEnd - t0`.
10. `update(state)`: if destroyed return. `lastState = state; hasState = true; t = now(); fast = (t - lastUpdateAt) < STREAM_MS; lastUpdateAt = t`.
    If `fast`: `clearTimeout(idleTimer); idleTimer = setTimeout(refine, REFINE_MS)`.
    If nothing was ever rendered: `render('tick')` synchronously and return (the table is never seen empty). Otherwise `schedule()`.
11. `schedule()`: if no frame is pending, `rafH = requestAnimationFrame(tick)` (a `setTimeout(16)` stands in where rAF is missing, for example in Node).
12. `tick()` (adaptive throttle): `rafH = 0`; if destroyed return; `gap = lastRenderMs < 8 ? 0 : Math.min(MAX_GAP_MS, 2 * lastRenderMs)`; if `now() - lastRenderEnd < gap` request another frame and return; else `render('tick')`. So a slow explainer never uses more than about half of the main thread.
13. `refine()`: `idleTimer = 0`; if destroyed or no state return; `fast = false; render('refine')`. Cells that were written fast have key suffix `\0H`, so the full-quality key differs and they are re-rendered with MathML; cells that were already full are skipped.
14. `flush()`: if destroyed or no state return; cancel the pending frame and the refine timer; `fast = false; render('tick')`.
15. `setRows(list)`: if destroyed return; cancel the pending frame; `buildRows(list)`; if a state exists `fast = false; render('tick')`.
16. `destroy()`: set `destroyed`, clear timers and frame, run the cleanup list (listeners and observers), `wrap.remove()`, clear the maps.
17. Theme change: row functions are re-evaluated by `render`; a TeX string that embeds a baked tint changes, so exactly those cells re-render; cells without tints are skipped by the key comparison. Nothing else is needed.

> Superseded in residue cleanup: the ResizeObserver callback no longer calls `setNarrow` itself: it records the width and applies it in the next animation frame (Chromium reported "ResizeObserver loop completed with undelivered notifications").

### 5.3 `staircase.js`

Pure helpers, verbatim (these are unit-tested to the values in section 7):

```js
const TWO_PI = 2 * Math.PI;
const PI_CH = '\u03c0';          // the character pi
const MAX_ROWS = 25;

// ---- pure helpers ----------------------------------------------------------------------------
export function argSteps(theta, kMin = -2, kMax = 2) {
  if (!Number.isFinite(theta)) return [];
  const out = [];
  for (let k = Math.ceil(kMin); k <= Math.floor(kMax); k++) out.push({ k, theta: theta + TWO_PI * k });
  return out;
}

// The representative of theta in (seam, seam + 2pi]; k is the number of turns added to theta to reach it.
export function homeStep(theta, seam = -Math.PI) {
  let k = Math.floor((seam + TWO_PI - theta) / TWO_PI);
  let t = theta + TWO_PI * k;
  if (t <= seam) { k += 1; t += TWO_PI; }                 // rounding guard: enforce the half-open window exactly
  else if (t > seam + TWO_PI) { k -= 1; t -= TWO_PI; }
  return { k, theta: t };
}

// "2π/3", "-π/3", "π", "0", "14π/3" when x is p·π/q (q <= 12, |p| <= 240) within 1e-9; otherwise null.
export function exactPi(x, { maxQ = 12, maxP = 240, tol = 1e-9 } = {}) {
  if (!Number.isFinite(x)) return null;
  if (Math.abs(x) < tol) return '0';
  const r = x / Math.PI;
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(r * q);
    if (p === 0 || Math.abs(p) > maxP) continue;
    if (Math.abs(r * q - p) < tol) {
      const a = Math.abs(p);
      const num = a === 1 ? PI_CH : `${a}${PI_CH}`;
      return `${p < 0 ? '-' : ''}${num}${q === 1 ? '' : '/' + q}`;
    }
  }
  return null;
}
// Three decimals, trailing zeros trimmed, ASCII minus, "-0" -> "0" (same style as the station readouts).
export function fmtDec(x, digits = 3) {
  if (!Number.isFinite(x)) return 'NaN';
  let s = x.toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}
const angle = (x) => exactPi(x) || fmtDec(x);
export function homeLabelFor(label) { return String(label).replace(/^arg/, 'Arg'); }
export function windowText(seam) { return `(${angle(seam)}, ${angle(seam + TWO_PI)}]`; }
// One list row: home = home representative, k = steps above it.
export function stepText(home, k) {
  const total = home + TWO_PI * k;
  const dec = fmtDec(total);
  if (k === 0) return { text: angle(home), dec, total, full: angle(home) };
  const base = `${angle(home)} ${k > 0 ? '+' : '-'} ${2 * Math.abs(k)}${PI_CH}`;
  const exact = exactPi(total);
  return exact ? { text: `${base} = ${exact}`, dec, total, full: `${base} = ${exact}` } : { text: base, dec, total, full: `${base} = ${dec}` };
}
export function argReadout(label, home) {
  const e = exactPi(home);
  const d = fmtDec(home);
  return `${homeLabelFor(label)} = ${d}${e && e !== d ? ` (${e})` : ''}`;     // "Arg z = 2.094 (2π/3)"; "Arg z = 0"
}
const wrapPi = (d) => { const w = d - TWO_PI * Math.floor((d + Math.PI) / TWO_PI); return w === -Math.PI ? Math.PI : w; };
// +1: crossed the seam counterclockwise (Arg dropped by about 2π); -1: clockwise; 0: no crossing.
export function seamJump(prevHome, nextHome) {
  const d = nextHome - prevHome;
  if (Math.abs(d) > Math.PI) { const w = wrapPi(d); if (Math.abs(w) < 1.0) return w > 0 ? 1 : -1; }
  return 0;
}
```

Row grammar (`stepText`): with `home` = the home representative, `k` the step: `k = 0` -> `angle(home)`; else `angle(home) + sign + (2|k|)π`, followed by `" = " + exactPi(home + 2πk)` only when the total has an exact form, where `sign` is `+` for k > 0 and `-` for k < 0,
`angle(x) = exactPi(x) ?? fmtDec(x)`, and `(2|k|)π` is printed `2π`, `4π`, `6π`, ... (`2` is not repeated: k = 1 prints `2π`). When the total has no exact form the row ends at the `π` term (`0.7 + 2π`): the decimal column beside it already says `6.983`, and repeating it only made long rows truncate at 320px. The decimal of the total goes in `.stair-dec`, drawn with a CSS `\2248 ` prefix. `full` is `text` plus `" = " + dec` in that no-exact-form case; it feeds the `aria-label`, so a screen-reader user still hears the total.

`createStaircase(container, opts)`:

1. Validate; `ensureStyle()` (`<style data-for="staircase">`). `id` sanitized; `kMin = ceil`, `kMax = floor` (defaults -2, 2; swap if reversed; cut to 25 rows with `console.warn`); `seam` default `-π` (non-finite -> `-π`); `label` default `arg z`; `onPick` kept only if a function.
2. State: `theta = null`, `prevHome = null`, `jumps = 0`, `picked = null`, timers, `tabK = (kMin <= 0 && kMax >= 0) ? 0 : kMax`.
3. Static DOM, in this order inside `div.staircase-wrap[data-stairs=id][data-jumps=0][data-dense=(rows > 8)]` with `--home-index = kMax`:
   `p.stair-set#ID-set`, `p.stair-arg#ID-arg`, `p.stair-window#ID-window`, then `div.stair-body` containing a decorative `div.stair-more` (U+22EE), `div.stair-list` (position: relative) holding `div.staircase-home[aria-hidden]` and `ol.staircase#ID-list`, and a second `div.stair-more`; then `p.stair-note#ID-note[aria-live=polite]`.
   The `ol` holds only `li` children (valid HTML). One `li#ID-k<k>[data-k]` for `k = kMax` down to `kMin`. Each `li` has one row element: a `button.stair-row[type=button][aria-pressed=false][tabindex]` when `onPick`, else `div.stair-row`; inside it: `span.stair-mark[aria-hidden]`, `span.stair-prefix`, `span.stair-text`, a single space text node, `span.stair-dec`. (The space keeps `textContent` readable: `2π/3 + 2π = 8π/3 8.378`.)
4. With `onPick`: click -> `setPicked(k); tabK = k; onPick(k)`; focus -> make that row the only `tabindex=0`; keydown: `ArrowUp` -> k + 1, `ArrowDown` -> k - 1, `Home` -> kMax, `End` -> kMin; if that row exists `preventDefault`, move the tab stop and focus it. `Enter` and `Space` need no code (native buttons fire click).
5. `render()`: set `aria-label` on the `ol` to `Names of the angle ${label}`; `win = windowText(seam)`; set `data-window` on the band and the wrap, `data-seam`, `data-home-visible = (kMin <= 0 && kMax >= 0 && theta != null)` (no home row, no band: also hidden in the undefined state); set `--home-index = kMax`.
   - Undefined state (`theta` null or not finite): set line `${label} is not defined here`; arg line `${Label} = undefined`; legend `The point 0 has no angle. Every direction reaches it, so ${label} is not defined.`; `data-home-k` and `data-arg` empty; every row: remove `is-home`, add `is-empty`, remove `aria-current`, prefix empty, text `—`, decimal empty. Return.
   - Else: `hs = homeStep(theta, seam)`, `home = hs.theta`; `data-home-k = hs.k`, `data-arg = String(home)`; set line `${label} = { ${angle(home)} + 2πk : k is any integer }`; arg line `argReadout(label, home)`; legend `Shaded step: the home window ${win}. ${Label} is the step inside it.`;
     for each row: `st = stepText(home, k)`; remove `is-empty`; toggle `is-home` for `k === 0` (and `aria-current="step"`); prefix `${Label} = ` for k = 0 else empty; `.stair-text = st.text`; `.stair-dec = st.dec`; with `onPick`, `aria-label = "step k = K: " + (k === 0 ? Label + " = " : "") + st.full`.
6. `update(t)`: if destroyed return. `theta = (typeof t === 'number' && isFinite(t)) ? t : null`. If `theta == null`: `prevHome = null`. Else `home = homeStep(theta, seam).theta`; `dir = prevHome == null ? 0 : seamJump(prevHome, home)`; `prevHome = home`;
   if `dir !== 0`: `jumps++`, `data-jumps`, `data-last-jump = dir`, note text `Seam crossed: ${Label} ${dir > 0 ? 'dropped' : 'rose'} by 2π. The set ${label} did not move.`, add class `is-jump` to the wrap (removed after 900 ms), clear the note after 3500 ms. Then `render()`.
7. `setSeam(s)`: ignore non-finite; `seam = s; prevHome = null` (a window change is not a crossing); `render()`. `setLabel(l)`: `label = String(l); render()`. `setPicked(k)`: `picked = rows.has(k) ? k : null`; toggle `is-picked` and, with `onPick`, `aria-pressed`. `destroy()`: clear timers, remove the root, clear the row map.
8. Seam-crossing test (`seamJump`): the home value moved by more than π while the set moved by less than 1 rad. This is how a station dragging z across the seam is told apart from a preset click (120 degrees to -90 degrees moves the set by 2.6 rad: not flagged).

### 5.4 Resolution and canvas management

None of the widgets draws on a canvas. The only canvas is the 1x1 colour probe in `katex.js`, created lazily on the first non-hex colour and never attached to the page. No devicePixelRatio handling is needed.

---

## 6. Mathematics

### 6.1 Formulas used by the widgets

1. Home step. For a representative `theta` and a window `(seam, seam + 2π]`: `k = floor((seam + 2π - theta) / 2π)`; `home = theta + 2πk`. Proof: `k <= m` gives `home <= seam + 2π`; `k > m - 1` gives `home > seam`, where `m = (seam + 2π - theta)/2π`. A guard after the formula adds or subtracts one turn if floating-point rounding put `home` on or outside the boundary, so `seam < home <= seam + 2π` always holds exactly. At the seam itself the window is half open: `-π -> π` (k = 1) for the principal seam, `0 -> 2π` for seam 0.
2. The set of names of an angle: `arg z = { home + 2πk : k in Z }`; step `k` of the list is `home + 2πk`.
3. Exact multiple of π: `r = x/π`; the smallest `q` in 1..12 with `|r·q - round(r·q)| < 1e-9` and `p = round(r·q)`, `p != 0`, `|p| <= 240` gives `p·π/q` in lowest terms (smallest q first guarantees lowest terms); `|x| < 1e-9` gives `0`; otherwise decimal.
4. Decimal: `toFixed(3)`, strip trailing zeros and a trailing point, `-0 -> 0`.
5. Seam crossing: `d = nextHome - prevHome`; flagged when `|d| > π` and `|wrap(d)| < 1`, where `wrap(d) = d - 2π·floor((d + π)/2π)` mapped to `(-π, π]`; direction `+1` when `wrap(d) > 0` (home dropped by about 2π: the point crossed counterclockwise).
6. Colour to hex: take the canvas pixel `(R, G, B)` after `fillStyle = raw`, `'#' + each channel in 2 hex digits`; alpha is dropped.

### 6.2 Worked solutions (hand-checked)

All checked three ways: by hand, by a node script (double precision), and against `docs/STORY.md`. Angles in radians. Each problem ends with a line "Asserted here" naming what this goal's tests pin; the other values are the cross-checks that `complex.js` and `problems.js` tests also pin.

**1.1.1** z1 = 3 - 2i, z2 = -1 + 4i (explainer rows product and quotient; footer).

Cartesian (Def 1.2.4 and 1.2.6): `x1x2 = -3`, `y1y2 = -8`, `x1y2 = 12`, `x2y1 = 2`.
- z1 z2 = (x1x2 - y1y2) + (x1y2 + x2y1)i = (-3 + 8) + (12 + 2)i = **5 + 14i**.
- z1/z2 = ((x1x2 + y1y2) + (-x1y2 + x2y1)i)/(x2^2 + y2^2) = (-3 - 8 + (-12 + 2)i)/17 = **-11/17 - (10/17)i** = -0.647059 - 0.588235i.

Polar: r1 = sqrt13 = 3.605551, theta1 = Arg z1 = atan2(-2, 3) = -0.588003 (-33.69 degrees); r2 = sqrt17 = 4.123106, theta2 = Arg z2 = atan2(4, -1) = pi - atan 4 = 1.815775 (104.04 degrees).
- product: r = sqrt13 sqrt17 = sqrt221 = 14.866069; angle theta1 + theta2 = 1.227772, already in (-pi, pi], so Arg = 1.227772. Same point: 14.866069 (cos 1.227772 + i sin 1.227772) = 14.866069 (0.336336 + 0.941742 i) = 5 + 14i. Check: atan2(14, 5) = 1.227772.
- quotient: r = sqrt13/sqrt17 = sqrt(13/17) = 0.874475; angle theta1 - theta2 = -2.403778, in (-pi, pi]; check atan2(-10/17, -11/17) = -pi + atan(10/11) = -2.403778; modulus check sqrt((11^2 + 10^2)/17^2) = sqrt221/17 = 0.874475.
- sum, for the fixture: z1 + z2 = 2 + 2i = 2.828427 e^{i 0.785398} (Cartesian is native to +).

Asserted here: the fixture strings product cart `5 + 14i`, polar `14.866\,e^{i\,1.228}`; sum cart `2 + 2i`, polar `2.828\,e^{i\,0.785}`; footer `same point: agree` (interaction script steps 2 and 8).

**1.3.1** z = -1 + i sqrt3.
Cartesian -> polar: r = sqrt(1 + 3) = 2. The angle: x < 0, y > 0, second quadrant; the reference angle is atan(sqrt3) = pi/3, so theta = pi - pi/3 = **2pi/3** (a bare arctan(y/x) = arctan(-sqrt3) = -pi/3 is off by pi: atan2 resolves it). z = 2(cos 2pi/3 + i sin 2pi/3) = **2e^{i 2pi/3}**.
Polar -> Cartesian: x = 2 cos(2pi/3) = 2(-1/2) = -1; y = 2 sin(2pi/3) = 2(sqrt3/2) = sqrt3 = 1.732051. Same point.
`arg z = { 2pi/3 + 2pi k }`; **Arg z = 2pi/3 = 2.094395**. Staircase rows (k = -2..2), exact and decimal:

| k | text | decimal |
|---|---|---|
| -2 | `2π/3 - 4π = -10π/3` | -10.472 |
| -1 | `2π/3 - 2π = -4π/3` | -4.189 |
| 0 | `Arg z = 2π/3` | 2.094 |
| 1 | `2π/3 + 2π = 8π/3` | 8.378 |
| 2 | `2π/3 + 4π = 14π/3` | 14.661 |

Readout `Arg z = 2.094 (2π/3)`. Input 14pi/3 (or any 2pi/3 + 2pi k) gives the identical list; input -pi gives `Arg z = 3.142 (π)` (home window is half open).
Asserted here: the table above (unit test `stepText`, interaction step 16) and the readouts.

**1.3.2** (sqrt3 + i)^10.
Polar: r = sqrt(3 + 1) = 2, theta = atan2(1, sqrt3) = pi/6. z^10 = 2^10 e^{i 10 pi/6} = 1024 e^{i 5pi/3}. Wrap onto the home step: 5pi/3 - 2pi = **-pi/3** (k = -1), so Arg = -pi/3 and z^10 = 1024(cos(-pi/3) + i sin(-pi/3)) = 1024(1/2 - i sqrt3/2) = **512 - 512 sqrt3 i** = 512 - 886.810013i.
Cartesian check (repeated squaring): z^2 = 3 - 1 + 2 sqrt3 i = 2 + 2 sqrt3 i; z^4 = (2 + 2 sqrt3 i)^2 = 4 - 12 + 8 sqrt3 i = -8 + 8 sqrt3 i; z^8 = (-8 + 8 sqrt3 i)^2 = 64 - 192 - 128 sqrt3 i = -128 - 128 sqrt3 i; z^10 = z^8 z^2 = (-128 - 128 sqrt3 i)(2 + 2 sqrt3 i) = -256 - 256 sqrt3 i - 256 sqrt3 i + 768 = 512 - 512 sqrt3 i. Both routes agree (numerically 511.99999999999994 - 886.8100134752646 i by ten multiplications, 512.0000000000001 - 886.8100134752651 i by polar).
Staircase of the result (home = -pi/3, k = -2..2): `-π/3 - 4π = -13π/3` (-13.614), `-π/3 - 2π = -7π/3` (-7.33), `Arg z = -π/3` (-1.047), `-π/3 + 2π = 5π/3` (5.236), `-π/3 + 4π = 11π/3` (11.519). The step above home, 5pi/3, is exactly the angle produced by 10 theta. Input 10pi/6 gives `Arg z = -1.047 (-π/3)`.
Asserted here: `homeStep(10pi/6)` = `{k: -1, theta: -pi/3}`, the five rows and the readout (unit tests, interaction step 17).

**1.4.1** 5th roots of unity.
Polar: c = 1, |c| = 1, Arg c = 0. The staircase of c is `0, 2pi, 4pi, 6pi, 8pi, 10pi, ...` (rows `0`, `0 + 2π = 2π`, `0 + 4π = 4π`, `0 + 6π = 6π`, `0 + 8π = 8π`, `0 + 10π = 10π`; decimals 0, 6.283, 12.566, 18.85, 25.133, 31.416). Dividing step k by 5: `w_k = e^{i 2 pi k / 5}`, k = 0..4; step k = 5 gives 2pi, the same point as k = 0, which is why there are exactly 5 roots.
Asserted here: the six staircase rows of c = 1 (unit test `stepText`, interaction step 19). The root coordinates below are pinned by the `complex.js` and `problems.js` goals.
Cartesian: `(cos 72k deg, sin 72k deg)`:

| k | w_k | primitive (gcd(k, 5) = 1) |
|---|---|---|
| 0 | 1 + 0i | no |
| 1 | 0.309017 + 0.951057i | yes |
| 2 | -0.809017 + 0.587785i | yes |
| 3 | -0.809017 - 0.587785i | yes |
| 4 | 0.309017 - 0.951057i | yes |

Exact: cos 72 deg = (sqrt5 - 1)/4 = 0.309017, cos 144 deg = -(sqrt5 + 1)/4 = -0.809017, sin 72 deg = sqrt(10 + 2 sqrt5)/4 = 0.951057, sin 36 deg = sqrt(10 - 2 sqrt5)/4 = 0.587785. Check: the roots sum to zero (1 + 2(0.309017) - 2(0.809017) = 0) and are the roots of z^5 - 1 = (z - 1)(z^4 + z^3 + z^2 + z + 1).

**2.1.1** f(z) = z^2 + iz, in u + iv in both addresses (explainer rows expand, u, v; footer compares the two evaluations).
Cartesian: (x + iy)^2 + i(x + iy) = x^2 - y^2 + 2xy i + ix - y = **(x^2 - y^2 - y) + i(2xy + x)**, so u = x^2 - y^2 - y, v = 2xy + x.
Polar: z = r e^{i theta}: r^2 e^{2i theta} + r e^{i(theta + pi/2)} (i is a quarter turn); cos(theta + pi/2) = -sin theta, sin(theta + pi/2) = cos theta, so **u = r^2 cos 2theta - r sin theta, v = r^2 sin 2theta + r cos theta**.
Three checks (all six numbers asserted in the interaction script):

| z | r, theta | Cartesian (u, v) | Polar (u, v) | w |
|---|---|---|---|---|
| 1 + i | sqrt2, pi/4 | 1 - 1 - 1 = -1; 2 + 1 = 3 | 2 cos(pi/2) - sqrt2 sin(pi/4) = 0 - 1 = -1; 2 sin(pi/2) + sqrt2 cos(pi/4) = 2 + 1 = 3 | -1 + 3i |
| 2i | 2, pi/2 | 0 - 4 - 2 = -6; 0 + 0 = 0 | 4 cos(pi) - 2 sin(pi/2) = -4 - 2 = -6; 4 sin(pi) + 2 cos(pi/2) = 0 | -6 |
| -1 | 1, pi | 1 - 0 - 0 = 1; 0 - 1 = -1 | cos(2pi) - sin(pi) = 1; sin(2pi) + cos(pi) = -1 | 1 - i |

(Floating point gives 6.1e-16 for the polar v at 2i; it prints as 0 at three decimals.)
Asserted here: all six (u, v) pairs in both columns and `same point: agree` at all three points (interaction step 10).

**2.2.2** Principal (2i)^(1/2).
Polar: |2i| = 2, Arg(2i) = pi/2 is the home step. Def 2.2.1: w^(1/2) = |w|^(1/2) e^{i Arg(w)/2} = sqrt2 e^{i pi/4} = sqrt2(cos 45 deg + i sin 45 deg) = sqrt2(sqrt2/2 + i sqrt2/2) = **1 + i**. The other name, step k = 1 (pi/2 + 2pi = 5pi/2), halves to 5pi/4 and gives sqrt2 e^{i 5pi/4} = **-1 - i**, which is NOT the principal value.
Cartesian: (a + bi)^2 = 2i gives a^2 - b^2 = 0 and 2ab = 2, so a = b and a^2 = 1: a = b = 1 or a = b = -1. Check (1 + i)^2 = 1 - 1 + 2i = 2i and (-1 - i)^2 = 2i.
Asserted here: the staircase rows and readout below (unit tests, interaction step 18); the roots themselves belong to `complex.js`.
Staircase of w = 2i: `Arg z = 1.571 (π/2)`; k = 1 `π/2 + 2π = 5π/2` (7.854); k = -1 `π/2 - 2π = -3π/2` (-4.712).

**2.4.1** A branch of z^(1/3) continuous along the negative real axis.
Polar: choose the window `0 < theta < 2pi` (seam sigma = 0, cut along the positive real axis): f(z) = r^(1/3) e^{i theta/3}. At z = -1: r = 1, theta = pi (inside the window), **f(-1) = e^{i pi/3} = cos 60 deg + i sin 60 deg = 1/2 + (sqrt3/2) i**. Continuity: from above, z = -1 + i eps has theta -> pi from below; from below, z = -1 - i eps has theta = pi + eps' (inside (0, 2pi)); both tend to e^{i pi/3}. With the principal window (-pi, pi], the same point from below has Arg = -pi + eps' and f -> e^{-i pi/3} = 1/2 - (sqrt3/2) i: a jump.
Cartesian check: (1/2 + (sqrt3/2) i)^2 = 1/4 - 3/4 + (sqrt3/2) i = -1/2 + (sqrt3/2) i; times (1/2 + (sqrt3/2) i): real = -1/4 - 3/4 = -1, imaginary = -(sqrt3/4) + (sqrt3/4) = 0; so f(-1)^3 = -1.
Widget values: `setSeam(0)`: window `(0, 2π]`; `update(-π/2)` gives `Arg z = 4.712 (3π/2)`; the crossing `update(π - 0.001)` then `update(-π + 0.001)` reads 3.141 then `Arg z = 3.143` (home values 3.140593 and 3.142593) with `data-jumps` 0; with the principal seam the same two updates read 3.141 then `Arg z = -3.141` and count 1 jump with the note `Seam crossed: Arg z dropped by 2π. The set arg z did not move.`
Asserted here: exactly these readouts and counters (interaction step 20) and `homeStep(π, 0)`, `homeStep(-π/2, 0)` (unit tests).

**3.2.1** f(z) = e^x (cos y + i sin y), explainer with columns "along dx" and "along i dy".
Cartesian: u = e^x cos y, v = e^x sin y; u_x = e^x cos y = v_y; u_y = -e^x sin y = -v_x; the partials are continuous everywhere, so f is entire (Thm 3.2.6); **f'(z) = u_x + i v_x = e^x cos y + i e^x sin y = f(z)** (and v_y - i u_y gives the same).
Polar form of the value: f = e^x e^{iy}, so |f| = e^x and arg f = { y + 2 pi k }; f' = f has the same polar address: |f'| = e^x, Arg f' = y (for y in (-pi, pi]). As a motion at z0: spin by y, stretch by e^x.
At z0 = 0.5 + 0.8i: e^0.5 = 1.648721, cos 0.8 = 0.696707, sin 0.8 = 0.717356: u_x = v_y = 1.148675, v_x = 1.182720, u_y = -1.182720. Along dx: u_x + i v_x = 1.148675 + 1.182720i. Along i dy: v_y - i u_y = 1.148675 + 1.182720i. Equal; |f'| = 1.648721, Arg f' = 0.8; check 1.648721 (0.696707 + 0.717356 i) = 1.148675 + 1.182720i. Rounded to three decimals the fixture reads `1.149 + 1.183i` on both sides, `same point: agree`.
Asserted here: those two strings and the verdict (interaction step 11).

---

## 7. Verification plan

Run everything from the repo root. Because `npm test` (`node --test tests/unit/`) fails on the installed Node 22.22 for every goal, tests are run by file name:

```
node --test tests/unit/i1-core-widgets.test.mjs            # A1, A2, and the pure helpers
node --test tests/unit/*.test.mjs                          # the whole unit suite (what npm test is meant to do)
node tools/smoke.mjs --route widgets-fixture --script tests/interact/i1-core-widgets.mjs --dark --out docs/review/iter-1/i1-core-widgets
```

The smoke route `widgets-fixture` is an unknown token on purpose: the router shows its "No such place" panel (a normal page, no `[data-station-error]`), so the script needs the shell's
`index.html`, KaTeX script and `css/theme.css` but no station. Smoke runs it at desktop (1280x860), phone (390x844) and, with `--dark`, desktop-dark (the page runs with the OS dark colour scheme). Expected final line:
`3/3 checks passed across 1 route(s).` and exit code 0. If the shell's router were changed so unknown tokens redirect, pass any route that loads (`--route home`); the script does not depend on the route.

`index.html`, `css/theme.css` and the router exist in the working tree (built concurrently by `i1-shell`); the script was verified against a copy of them. If they are missing or broken when you build, verify in a scratch site: make a private directory with a unique name under the scratchpad (the scratchpad is shared by concurrent agents; a generic name like `proto` was already taken once),
put in it a stub `index.html` (`<link rel="stylesheet" href="vendor/katex/katex.min.css">`, `<link rel="stylesheet" href="css/theme.css">`, `<script src="vendor/katex/katex.min.js"></script>`, `<main id="view"><div class="panel">No such place</div></main>`), a stub `css/theme.css` defining every token in ARCHITECTURE 6 for light and dark, a copy of `tools/smoke.mjs`,
a symlink `vendor` -> the repo's `vendor`, and the three modules plus `tests/`; run the same smoke command there. Delete nothing in the repo.

### 7.1 Acceptance criteria

| Id | Method | Exact check | Passing looks like |
|---|---|---|---|
| A1 | unit_test | `node --test tests/unit/i1-core-widgets.test.mjs`; tests "A1 argSteps", "A1 homeStep (the spec cases)", "A1 homeStep (problem angles and the half-open window)" | `argSteps(2pi/3, -2, 2)`: five entries, k = -2..2, `theta = 2pi/3 + 2pi k` within 1e-12. `homeStep(2pi/3 + 4pi)` = `{k: -2, theta: 2pi/3}`; `homeStep(pi)` = `{0, pi}`; `homeStep(-pi)` = `{1, pi}`; `homeStep(pi, 0)` = `{0, pi}`; `homeStep(-pi/2, 0)` = `{1, 3pi/2}`; `homeStep(2pi, 0)` = `{0, 2pi}`. Plus 2000 random inputs satisfy `seam < theta' <= seam + 2pi`. 0 failures. |
| A2 | unit_test (+ in-browser steps of the script) | same file; tests "A2 KaTeX renders...", "A2 bad TeX never throws and is reported", "A2 tint", "A2 without KaTeX". KaTeX is loaded into Node with `vm.runInThisContext(fs.readFileSync('vendor/katex/katex.min.js', 'utf8'))`; `require()` of that file FAILS because `package.json` has `"type": "module"` | `texToHtml('\\frac{2\\pi}{3}')` contains `class="katex"`; `tint('x', '--cart')` matches `/^\\textcolor\{.+\}\{x\}$/` (with `getComputedStyle` stubbed to return ` #2563eb ` it is exactly `\textcolor{#2563eb}{x}`; without any style it is `\textcolor{currentColor}{x}`); `texToHtml('\\badcommand{')` returns a string containing `tex-error` without throwing; `tex(fakeEl, '\\badcommand{')` sets `textContent` to the source and adds `tex-error`; with `globalThis.katex` deleted `texToHtml('a<b')` is `a&lt;b`. |
| A3 | code_inspection + interaction script sections "explainer: ..." | see checklist 7.2 and Appendix B | the table, ids, tones, diffing, coalescing and footer behave as listed |
| A4 | code_inspection + interaction script sections "staircase: ..." | see checklist 7.3 and Appendix B | `#iw-st-k0` is `is-home` with the prefix `Arg z = `; `#iw-st-k1` reads `2π/3 + 2π = 8π/3`; the band encloses the home row |
| story | screenshot_review | read `docs/review/iter-1/i1-core-widgets/widgets-fixture--desktop--fixtures.png`, `...--phone--fixtures.png` and `...--desktop-dark--fixtures.png` | (1) the explainer shows two columns whose headings and stripes are visibly different hues, the product row is washed on the polar side and the sum row on the Cartesian side, the footer has a green disc and `agree`; (2) at phone width the same explainer is one column with the heading `Cartesian (slide)` above `5 + 14i` and `Polar (spin-and-stretch)` above `14.866 e^{i 1.228}`; (3) the staircase has one shaded, bold row `Arg z = 2π/3` and four lighter rows with exact angles; (4) the dark-theme image has no unreadable text and no light patches; (5) nothing overflows horizontally. |

### 7.2 A3 code-inspection checklist (`js/core/explainer.js`)

1. `createExplainer` builds a `<table class="explainer">` (grep `'table'` and `class: 'explainer'`), with `thead`, `tbody` and, when `spec.same` is a function, `tfoot`.
2. Each column heading cell sets `--ex-tone` to `var(<tone>)` and the stylesheet colours it with `var(--ex-tone)`; the default columns carry tones `--cart` and `--polar`.
3. Cell ids are exactly `` `${id}-${row.id}-${col.key}` `` and the footer row id is `` `${id}-same` ``; cells are written by `tex(td, src, ...)` imported from `./katex.js`.
4. `update()` stores the state and schedules ONE `requestAnimationFrame` handle (`schedule()` checks for a pending handle); the first render is synchronous; `tick()` throttles; `refine()` upgrades after 220 ms.
5. `writeCell` returns early when `lastKey.get(td) === key` (unchanged TeX is not re-rendered).
6. The footer text is built from `same point: ` + `agree` | `differ` | `not checked`.
7. Styles come from one injected `<style data-for="explainer">`; run `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" js/core/katex.js js/core/explainer.js js/core/staircase.js`: the only hits allowed are the two `'#010203'` canvas-sentinel lines in `katex.js`.
8. No `import` other than `./katex.js` in `explainer.js`; none in `katex.js` or `staircase.js`; no `document` or `window` access at module top level (an `import` of each file in Node must not throw); no `alert`, `fetch`, `XMLHttpRequest`, `localStorage`.
9. `destroy()` removes: the `themechange` listener, the media-query listener, the `MutationObserver`, the `ResizeObserver`, the timers and the rAF handle.

### 7.3 A4 code-inspection checklist (`js/core/staircase.js`)

1. `<ol class="staircase">` containing one `li` per k with `id = `${id}-k${k}``, `data-k`.
2. The home row gets class `is-home` and the prefix `Arg z = ` (from `homeLabelFor(label)`); exactly one row has it (k = 0).
3. `div.staircase-home` exists, is positioned with `--home-index`, and carries `data-window`; `#${id}-window` states the window text; the exact-π form is produced by `exactPi` (for example `2π/3 + 2π = 8π/3`).
4. `#${id}-arg` text equals `argReadout(label, home)`.
5. Ghost rows differ from the home row by marker opacity (`var(--ghost-alpha)`), text colour and weight, not by colour alone; the picked mark is an inset ring, not an outline, so it never hides the focus ring; reduced-motion rules disable the pulse (the band has no transition).
6. `onPick(k)` is called with an integer on click and on Enter/Space; roving tabindex with exactly one `tabindex="0"`.

### 7.4 Unit test cases (all inside the file in Appendix A)

| Function | Input | Expected |
|---|---|---|
| `argSteps` | `(2pi/3, -2, 2)`; `(1, 3, 1)`; `(NaN)`; `(0)` | five entries `2pi/3 + 2pi k`; `[]`; `[]`; five entries |
| `homeStep` | the six spec cases; `(0, -pi)` -> `{0, 0}`; `(0, 0)` -> `{1, 2pi}`; `(10pi/6, -pi)` -> `{-1, -pi/3}`; `(pi/2, -pi)` -> `{0, pi/2}`; `(-3pi, -pi)` -> `{2, pi}`; `(3pi, -pi)` -> `{-1, pi}`; `(pi, 0)` -> `{0, pi}` | as written, 1e-9 |
| `exactPi` | 2pi/3, 8pi/3, -pi/3, pi, 0, 2pi, 3pi/2, -4pi/3, 14pi/3, -10pi/3, 5pi/3, pi/12, 4pi, 85pi/12, -pi; pi/13, 0.5, 2.0944, NaN, Infinity | `2π/3`, `8π/3`, `-π/3`, `π`, `0`, `2π`, `3π/2`, `-4π/3`, `14π/3`, `-10π/3`, `5π/3`, `π/12`, `4π`, `85π/12`, `-π`; then `null` x5 |
| `fmtDec` | 2pi/3, pi, 0, -1e-7, 1, -pi/3, 2pi, 8pi/3, 1.5, pi - 0.001, pi + 0.001 | `2.094`, `3.142`, `0`, `0`, `1`, `-1.047`, `6.283`, `8.378`, `1.5`, `3.141`, `3.143` |
| `stepText` | the 20 rows in the test (home 2pi/3, -pi/3, 0, pi/2, pi, 0.7) | e.g. `(2pi/3, 1)` -> `2π/3 + 2π = 8π/3`, `8.378`; `(-pi/3, -1)` -> `-π/3 - 2π = -7π/3`, `-7.33`; `(0, 5)` -> `0 + 10π = 10π`, `31.416`; `(0.7, 1)` -> `0.7 + 2π`, `6.983` (no exact form: no "= decimal" tail; `full` = `0.7 + 2π = 6.983`) |
| `argReadout`, `windowText`, `homeLabelFor` | see test | `Arg z = 2.094 (2π/3)`, `Arg z = -1.047 (-π/3)`, `Arg z = 0`, `(-π, π]`, `(0, 2π]`, `(-π/2, 3π/2]`, `Arg z` |
| `seamJump` | (pi - 0.1, -pi + 0.1), reverse, (pi - 0.1, 0.5), (1, 1.2), (2pi/3, -pi/2), (2pi - 0.1, 0.1) | `1`, `-1`, `0`, `0`, `0`, `1` |
| `sanitizeId`, `shortHeading` | `r^n`, `ok_1-a`, `a b.c`; the headings | `r-n`, `ok_1-a`, `a-b-c`; `Cartesian`, `Polar`, `As a motion`, `(x)` |
| `texToHtml`, `tex`, `tint`, `texColor` | see A2 | see A2 |

### 7.5 Interaction-script steps (`tests/interact/i1-core-widgets.mjs`, the verified script is Appendix B)

The script builds fixtures inside the page from the real modules (dynamic `import('./js/core/...')` inside `page.evaluate`) and appends them inside `#view` (the real shell makes `<body>` a grid, so a stray `<body>` child gets a sidebar-sized cell). It reads and asserts only DOM state, never pixels, except layout rectangles. Steps, in order:

1. Fixtures: E1 multiply (problem 1.1.1) with a title, `native` badges, an empty row, a throwing row and a bad-TeX row, in a 720px box; the same rows in a 320px box; E2 problem 2.1.1; E3 problem 3.2.1 with custom column keys `dx`/`dy`; E4 problem 2.2.2 with a third column; staircases `iw-st` (k -2..2, `onPick`) and `iw-st2` (k 0..5, label `arg c`, no `onPick`).
2. Structure and ids: `#iw-ex-product-cart`, `-polar`, `#iw-ex-sum-*`, `#iw-ex-same`, `-same-cart`, `-same-polar` exist once; `data-tex` of the product cells is `5 + 14i` and `14.866\,e^{i\,1.228}`; footer `same point: agree`, `data-agree="true"`; the caption is the title.
3. Colours: computed colour of each heading equals `var(--cart)` / `var(--polar)` resolved on a probe; the colour of the first tinted KaTeX span inside the product cells equals the same; `--cart` differs from `--polar`.
4. Native badge `easy in Polar` on the product row; `data-native` true on the polar cell and false on the Cartesian cell.
5. Empty cell is `—` with `is-empty`; the throwing cell is `n/a` with `tex-error`; the bad-TeX cell shows `\badcommand{` with `tex-error`; exactly one `console.error` was logged for the row exception (the script swaps `console.error` while creating the fixture).
6. Layout: stacked when the viewport is <= 560px or the table is <= 560px wide (the 320px box is stacked even on desktop); side by side otherwise; a live resize of the 320px box to 720px flips it (desktop only) and back; no horizontal page overflow.
7. Scheduling: 50 updates in one task make zero synchronous renders, then exactly one `stats.renders` and, after the 220 ms refine, exactly one `stats.refines`; an update with identical TeX leaves `stats.cellWrites` unchanged; `(2 + i)(1 + i)` shows `1 + 3i` / `3.162\,e^{i\,1.249}`.
8. Verdicts: `agree: false` gives `same point: differ`, `data-agree="false"`; back to `agree`.
9. `setRows` replaces rows and renders the last state (`z1 + z2 = 2 + 2i`).
10. Problem 2.1.1: at z = 1 + i, 2i, -1 the cells hold u, v = (-1, 3), (-6, 0), (1, -1) in both columns, the footer agrees, no `.tex-error` in the table, the derivation row contains `\cos 2\theta`.
11. Problem 3.2.1: custom ids `#iw-ex4-limit-dx`, `-dy`, `#iw-ex4-same-dx`; headings `along Δx` / `along iΔy`; both limits read `1.149 + 1.183i`; footer agrees.
12. Problem 2.2.2: three header cells, `#iw-ex5-root-motion` is plain text `halve the angle, take the square root of the length` with no `.katex` and class `ex-tinted`; on desktop the three cells share a row.
13. Advisory: contrast of tone tokens logged (warning below 4.5:1).
14. Colour normalisation: `texColor('rgb(37, 99, 235)')` is `#2563eb`; `#abcd` is `#aabbcc`; an `oklch` custom property gives a 6-digit hex; a missing token gives `currentColor`; tints of both render without `tex-error`.
15. Theme: set `data-theme` on `<html>` (toggle), wait 4 frames: the tinted span colour equals the new `--cart`; a screenshot `theme-flipped` is taken; the attribute is removed again.
16. Staircase, problem 1.3.1: readout `Arg z = 2.094 (2π/3)`; set line `arg z = { 2π/3 + 2πk : k is any integer }`; five `li`, one `is-home` = `#iw-st-k0`; the five row texts and the decimals `8.378`, `-10.472`; window text and `data-window` `(-π, π]`; the band rectangle matches the home row's top and bottom within 1.5px.
17. Representatives and problem 1.3.2: `14π/3` gives the same readout; `-π` gives `Arg z = 3.142 (π)`; `10π/6` gives `Arg z = -1.047 (-π/3)`, and k = 1 reads `-π/3 + 2π = 5π/3`, k = -1 reads `-π/3 - 2π = -7π/3`.
18. Problem 2.2.2: `π/2` gives `Arg z = 1.571 (π/2)` and k = 1 `π/2 + 2π = 5π/2`.
19. Problem 1.4.1: `iw-st2` reads `Arg c = 0`, six rows, no buttons, k = 1 `0 + 2π = 2π`, k = 5 `0 + 10π = 10π`; the band sits behind the bottom row.
20. Problem 2.4.1: `setSeam(0)`, `update(-π/2)` gives `Arg z = 4.712 (3π/2)` and window `(0, 2π]`; crossing `π - 0.001` to `-π + 0.001` gives `Arg z = 3.143`, `data-jumps` 0; back on the principal seam the same crossing gives `Arg z = -3.141`, `data-jumps` 1 and the note sentence; `update(0.5)` afterwards is not counted. A moved seam does not move the band: `#iw-st-k0` is still the home row and the band still encloses it. With no exact form the row omits the `= decimal` tail (`0.5 + 2π`, decimal column `6.783`) and the accessible name says `step k = 1: 0.5 + 2π = 6.783`.
21. Picking and keyboard: clicking `#iw-st-k1 button` calls `onPick(1)`, sets `aria-pressed` and `is-picked`; accessible name `step k = 1: 2π/3 + 2π = 8π/3`; exactly one `tabindex="0"`; `ArrowUp` from k0 focuses k1, `End` focuses k-2, `Enter` picks (`[1,-2]`); `setPicked(null)` clears. Focus versus picked (computed style): a picked, unfocused step has `outline-style: none` and a non-empty `box-shadow` (the picked mark); the same step with keyboard focus has `outline: solid 3px` in the `--focus` colour and the same `box-shadow`; a focused, unpicked step has the ring and no `box-shadow`.
22. z = 0: `update(null)` gives `Arg z = undefined`, no home row, legend `The point 0 has no angle...`, every row an em dash, and the band hidden (`getComputedStyle(.staircase-home).display === 'none'`, `data-home-visible="false"`); on the next number the band is `block` again and encloses the k = 0 row. A staircase whose rows do not include k = 0 (`kMin = 1`) has no home row, no band, and a correct `#ID-arg`.
23. Motion: the band has no transition (`transitionDuration` 0s). After a seam crossing the Arg line's `animationName` is `stair-pulse`; with `emulateMedia({ reducedMotion: 'reduce' })` it is `none` (and the band's `transitionDuration` is at most 0.001 s; the shell's global reduced-motion rule would make it `1e-05s`).
24. `setLabel('arg w')` changes the readout to `Arg w = ` and the set line to `arg w = {`; `destroy()` on every widget removes all `.explainer-wrap` and `.staircase-wrap`; later `update` and `destroy` calls do nothing; no console errors during the whole script; the fixture section is removed.

Pass condition: no assertion throws at any of the three viewports; the smoke harness prints zero problems for the route (no console errors, no page errors, no failed or external requests, no horizontal overflow, no router error panel).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases handled.**

- Explainer: `update(undefined)`; a row function that returns a number (coerced with `String`); a row function that throws (cell `n/a`, one log); invalid TeX (source shown); KaTeX not loaded (source shown, class `tex-error`); `same` throws or returns a non-object; `agree` not a boolean (`not checked`, never a false `agree`); `columns` with more than 3 entries (extras ignored); a tone that is not a token (falls back to `--text`); duplicate row ids (second skipped, `console.warn`); row ids with characters outside `[A-Za-z0-9_-]` (sanitized, so `r^n` is `r-n`: stations must use the sanitized id in selectors, or avoid such ids); `native` naming a missing column (ignored); a detached or zero-width container (narrow flag stays unset until the observer reports a width, media query still applies); `destroy()` twice; `update` after `destroy`; a theme token the page does not define (the tint is `currentColor`, the CSS falls back to system colours).
- Staircase: `update(NaN)`, `null`, a string (undefined state); huge angles (finite floats work; beyond about 1e9 the result is accurate to about 1e-6); `kMin > kMax` (swapped); 0 outside `kMin..kMax` (band hidden); non-finite seam ignored; seam outside (-pi, pi] works (the window is just `(seam, seam + 2pi]`); an angle exactly on a window boundary (half-open rule); `Arg` of a point on the negative real axis passed as `-pi` (reported as `pi`); `onPick` absent (no buttons, not focusable); more than 25 rows (cut); `destroy()` twice.
- katex.js: empty, null or non-string `src`; a token resolved to `rgb()`, `hsl()`, `oklch()` or with alpha (converted, alpha dropped); `getComputedStyle` throwing or absent (`currentColor`).

**Performance plan.** Targets: dragging a plane point at 60 fps with an explainer beside it. Measures, in order of effect:
(1) updates are cheap (store state, at most one rAF scheduled); (2) rendering skips cells whose TeX did not change; (3) KaTeX output is cached (LRU 300); (4) while updates stream in, KaTeX runs with `output: 'html'` (no MathML half), 220 ms after the last update one refine pass restores MathML for screen readers; (5) an adaptive throttle never lets the explainer take more than about half of the main thread (`gap = min(100 ms, 2 x last render time)` once a render takes 8 ms or more).
Measured in headless Chromium under Playwright (4-core container shared with other agents, so treat as relative):

| Measurement | Result |
|---|---|
| 26 KaTeX cells in a bare `div`: `renderToString` / `innerHTML` / layout, MathML on | 3.0 / 1.6 / 6.6 ms |
| same, `output: 'html'` | 2.5 / 0.6 / 2.6 ms |
| 12-row explainer (26 cells) in the table, everything changing, forced layout, median render | 24.1 ms with MathML, 13.6 ms without (1280px); 23.5 vs 19.4 ms (390px, stacked) |
| 2 s simulated drag, update every frame, 3 ms of other per-frame work, 12 rows | frame time median 16.7 ms, 95th percentile 16.7 ms, one 33 ms frame; 35 explainer renders for 121 updates; 2 renders after the drag stops |
| same, 5 rows (12 cells) | 109 renders for 122 updates (desktop), 88 for 122 (390px); frame time 16.7 ms |

A typical station explainer has 3 to 6 rows. Cost is dominated by layout of KaTeX spans, not by `renderToString`. The `ResizeObserver` and the `MutationObserver` do no work between events.

**Accessibility.**
- Explainer: a real table with explicit roles (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`) so semantics survive the stacked `display: block` layout; `scope` on headers; a caption or `aria-label`; the `thead` is visually hidden, not removed, when stacked; at rest every formula carries MathML for screen readers (the visual half is `aria-hidden`); no live region on the table (stations announce changes through their own readout); verdict and badge are text.
- Staircase: an ordered list with a label; each step is a button with a full accessible name when `onPick` is given; `aria-pressed` for the picked step, `aria-current="step"` on the home step; roving tabindex with arrow keys; visible `--focus` ring (kept distinct from the picked mark); the only live region is the jump note (`aria-live="polite"`, appears rarely); the decorative band, markers and ellipses are `aria-hidden`.
- Text sizes: nothing below 0.72rem; colour is never the only signal (section 3). Zoom to 200% reflows (cells wrap, rows are fixed height but never wrap: text is ellipsised, the full text, including the total of a step with no exact form, is in the step's `aria-label` when buttons exist).

**Reduced motion.** Neither widget animates by itself. The only motion is the arg-line pulse (0.9 s) on a seam crossing in the staircase; it is removed under `prefers-reduced-motion: reduce` (the note text and `data-jumps` still appear). The shaded band never moves (it is always behind k = 0), so it has no transition. The explainer has no animation; its scheduling does not depend on motion preferences.

**Phone layout (390px).** No horizontal page scroll (verified by the script at every viewport). The explainer stacks below 560px (viewport) or when its own box is <= 560px; cells carry their heading; the footer reads the same. The staircase list is full width of its host; rows are 40px (32px when more than 8 rows); the longest row text (`-π/3 - 4π = -13π/3`) with its decimal fits 358px at 16px.

---

## 9. Out of scope

Plane overlays and ghost arcs on the plane (`plane.js`), the 3D helix (`three-view.js`), theme switching and tokens (`theme.js`, `theme.css`), the store, any station composition (which rows, which numbers, which `native` badge, which presets), complex arithmetic and number formatting (`complex.js`; stations pass finished TeX), a text-to-speech version of TeX, auto-render of arbitrary page text, animation of cell changes, drag-and-drop or editing inside the explainer, the Riemann-surface picture of the staircase (a later iteration), audio and video.

---

## 10. Requests to other owners, rules for stations, risks

Requests (not done here; ownership forbids it):

1. `package.json` (no goal owns it): `"test": "node --test tests/unit/"` fails on Node 22.22 with `Cannot find module '.../tests/unit'`. Change to `"test": "node --test tests/unit/*.test.mjs"` (the shell expands the glob under npm, so it works on every Node version). Until then every goal must run tests by file name, as in section 7.
1a. The goal text for `i1-core-widgets` (`docs/goals/iter-1.json`, `interfaces`) says "No imports between the three files". Amend it to "`explainer.js` may import `./katex.js`" (D1: acceptance A3 requires cells rendered via `katex.tex`, and the three files are one goal).
2. `i1-shell` must provide: the classic `<script src="vendor/katex/katex.min.js">` BEFORE the module scripts; `<link rel="stylesheet" href="vendor/katex/katex.min.css">` (without it KaTeX markup is unstyled and MathML and HTML text both show); every token in ARCHITECTURE 6 defined for light and dark, in particular `--surface-2`, `--text-muted`, `--ok`, `--warn`, `--danger`, `--focus`, `--ghost-alpha`, `--font-mono`, `--space-1` to `--space-3`, with `--cart`, `--polar` and `--output` at 4.5:1 or better on `--surface` in both themes; a router that shows the "No such place" panel (not a redirect) for an unknown token such as `widgets-fixture`.
3. Station goals (wave 1) are designed from ARCHITECTURE only. These rules in section 4.2 are binding for stations and should be forwarded by the orchestrator:
   (a) call `cart()`, `polar()`, `input()`, `output()` inside the row function at render time, never once at mount (the colour is baked into the string, so a theme change only recolours strings that are re-created);
   (b) prose in a cell is returned as `{ text: '...' }` or wrapped in `\text{...}`; a bare string is TeX;
   (c) put the sanitized ids in selectors (`r^n` becomes `r-n`);
   (d) `explainer.update(state)` may be called on every pointer move; do not throttle it yourself;
   (e) call `destroy()` of every explainer and staircase in `unmount`;
   (f) feed the staircase any representative of the angle, `null` at z = 0, and read the home step from `Arg` (k in `onPick` means "steps above the home step");
   (g) `native` is decided from the STORY table (1.1.1: Cartesian for the arithmetic, polar as the check; 1.3.2, 1.4.x, 2.2.2: polar; 3.2.1: Cartesian).

Risks:

- Explainer cost grows with the number of changing cells; keep a station explainer to about 12 rows at most. The adaptive throttle protects frame rate but makes numbers lag by up to 100 ms during a drag.
- The refine pass rewrites cells 220 ms after a drag stops; scripts that read `textContent` right after an update see KaTeX without MathML (assert on `data-tex` or wait for `stats.refines`).
- `texColor` relies on a canvas for non-hex tokens; if `theme.css` defines tokens with `light-dark()` in a browser that cannot parse it, tints fall back to `currentColor` (text colour) rather than breaking, but the colour code would be lost: keep tokens as hex.
- KaTeX 0.16.11 is pinned in `vendor/`; the colour grammar finding (D4) is specific to this version.
- The fixture route depends on the shell's `index.html`; see 7 for the scratch-site fallback.

---

## Appendix A: `tests/unit/i1-core-widgets.test.mjs` (the file on disk, synced after fix round 1: 14 tests pass on Node 22.22)

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { argSteps, homeStep, exactPi, fmtDec, stepText, argReadout, windowText, seamJump, homeLabelFor } from '../../js/core/staircase.js';
import { texToHtml, tex, tint, cart, polar, input, output, texColor, escapeHtml, clearTexCache } from '../../js/core/katex.js';
import { sanitizeId, shortHeading } from '../../js/core/explainer.js';

const PI = Math.PI;
const near = (a, b, e = 1e-12) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

// ---------------- A1
test('A1 argSteps', () => {
  const s = argSteps(2 * PI / 3, -2, 2);
  assert.equal(s.length, 5);
  s.forEach((e, i) => { assert.equal(e.k, i - 2); near(e.theta, 2 * PI / 3 + 2 * PI * (i - 2)); });
  assert.deepEqual(argSteps(1, 3, 1), []);
  assert.deepEqual(argSteps(NaN), []);
  assert.equal(argSteps(0).length, 5);                       // defaults -2..2
});
test('A1 homeStep (the spec cases)', () => {
  const cases = [[[2 * PI / 3 + 4 * PI], -2, 2 * PI / 3], [[PI], 0, PI], [[-PI], 1, PI], [[PI, 0], 0, PI], [[-PI / 2, 0], 1, 3 * PI / 2], [[2 * PI, 0], 0, 2 * PI]];
  for (const [args, k, th] of cases) { const r = homeStep(...args); assert.equal(r.k, k, JSON.stringify(args)); near(r.theta, th); }
});
test('A1 homeStep (problem angles and the half-open window)', () => {
  const cases = [                     // [theta, seam, k, home]
    [0, -PI, 0, 0], [0, 0, 1, 2 * PI],
    [10 * PI / 6, -PI, -1, -PI / 3],                         // 1.3.2: 5pi/3 is -pi/3
    [PI / 2, -PI, 0, PI / 2],                                // 2.2.2: Arg(2i)
    [-3 * PI, -PI, 2, PI], [3 * PI, -PI, -1, PI], [PI, -PI, 0, PI],
    [-PI + 1e-13, -PI, 0, -PI + 1e-13],
    [PI, 0, 0, PI],                                          // 2.4.1: pi is inside (0, 2pi]
  ];
  for (const [t, seam, k, th] of cases) {
    const r = homeStep(t, seam);
    assert.equal(r.k, k, `${t} seam ${seam}`); near(r.theta, th, 1e-9);
    assert.ok(r.theta > seam && r.theta <= seam + 2 * PI, 'result is in (seam, seam + 2pi]');
  }
  for (let i = 0; i < 2000; i++) {                           // postcondition on random inputs, any seam
    const t = (Math.random() - 0.5) * 200, seam = (Math.random() - 0.5) * 8, r = homeStep(t, seam);
    assert.ok(r.theta > seam && r.theta <= seam + 2 * PI); near(r.theta, t + 2 * PI * r.k, 1e-9);
  }
});
test('exactPi', () => {
  const T = [[2 * PI / 3, '2π/3'], [8 * PI / 3, '8π/3'], [-PI / 3, '-π/3'], [PI, 'π'], [0, '0'], [2 * PI, '2π'], [3 * PI / 2, '3π/2'], [-4 * PI / 3, '-4π/3'], [14 * PI / 3, '14π/3'],
    [-10 * PI / 3, '-10π/3'], [5 * PI / 3, '5π/3'], [PI / 12, 'π/12'], [PI / 13, null], [0.5, null], [2.0944, null], [-PI, '-π'], [4 * PI, '4π'], [85 * PI / 12, '85π/12'], [NaN, null], [Infinity, null]];
  for (const [x, e] of T) assert.equal(exactPi(x), e, String(x));
  assert.equal(exactPi(Math.atan2(Math.sqrt(3), -1)), '2π/3');          // 1.3.1 as computed by atan2
  assert.equal(exactPi(10 * PI / 6 - 2 * PI), '-π/3');
});
test('fmtDec', () => {
  const T = [[2 * PI / 3, '2.094'], [PI, '3.142'], [0, '0'], [-1e-7, '0'], [1, '1'], [-PI / 3, '-1.047'], [2 * PI, '6.283'], [8 * PI / 3, '8.378'], [1.5, '1.5'], [PI - 0.001, '3.141'], [PI + 0.001, '3.143']];
  for (const [x, e] of T) assert.equal(fmtDec(x), e, String(x));
});
test('stepText: the rows of the staircase for the review problems', () => {
  const rows = [      // [home, k, text, dec]
    [2 * PI / 3, -2, '2π/3 - 4π = -10π/3', '-10.472'], [2 * PI / 3, -1, '2π/3 - 2π = -4π/3', '-4.189'], [2 * PI / 3, 0, '2π/3', '2.094'],
    [2 * PI / 3, 1, '2π/3 + 2π = 8π/3', '8.378'], [2 * PI / 3, 2, '2π/3 + 4π = 14π/3', '14.661'],             // 1.3.1
    [-PI / 3, -2, '-π/3 - 4π = -13π/3', '-13.614'], [-PI / 3, -1, '-π/3 - 2π = -7π/3', '-7.33'], [-PI / 3, 0, '-π/3', '-1.047'],
    [-PI / 3, 1, '-π/3 + 2π = 5π/3', '5.236'], [-PI / 3, 2, '-π/3 + 4π = 11π/3', '11.519'],                  // 1.3.2
    [0, 1, '0 + 2π = 2π', '6.283'], [0, 2, '0 + 4π = 4π', '12.566'], [0, 5, '0 + 10π = 10π', '31.416'],      // 1.4.1
    [PI / 2, 1, 'π/2 + 2π = 5π/2', '7.854'], [PI / 2, -1, 'π/2 - 2π = -3π/2', '-4.712'],                     // 2.2.2
    [PI, 0, 'π', '3.142'],                                                                                   // 2.4.1 at -1
    [0.7, 1, '0.7 + 2π', '6.983'], [0.7, -1, '0.7 - 2π', '-5.583'],                                           // no exact form: no "= decimal" tail (the decimal column shows it)
    [3.142, 5, '3.142 + 10π', '34.558'], [3.142, 0, '3.142', '3.142'],
  ];
  for (const [h, k, text, dec] of rows) { const r = stepText(h, k); assert.equal(r.text, text, `${h} k=${k}`); assert.equal(r.dec, dec); near(r.total, h + 2 * PI * k); }
});
test('stepText: full is the text plus the total, for the accessible name', () => {
  assert.equal(stepText(2 * PI / 3, 1).full, '2π/3 + 2π = 8π/3');                     // exact: text already says it
  assert.equal(stepText(2 * PI / 3, 0).full, '2π/3');
  assert.equal(stepText(0.7, 1).full, '0.7 + 2π = 6.983');                              // inexact: the total is added back
  assert.equal(stepText(0.7, -1).full, '0.7 - 2π = -5.583');
  assert.equal(stepText(0.7, 0).full, '0.7');
  for (const [h, k] of [[2 * PI / 3, 2], [-PI / 3, -2], [0, 5], [PI, 1], [0.7, 3]]) assert.ok(stepText(h, k).full.startsWith(stepText(h, k).text));
});
test('readouts and labels', () => {
  assert.equal(argReadout('arg z', 2 * PI / 3), 'Arg z = 2.094 (2π/3)');
  assert.equal(argReadout('arg z', -PI / 3), 'Arg z = -1.047 (-π/3)');
  assert.equal(argReadout('arg z', 0), 'Arg z = 0');
  assert.equal(argReadout('arg c', PI), 'Arg c = 3.142 (π)');
  assert.equal(argReadout('arg z', 0.7), 'Arg z = 0.7');
  assert.equal(windowText(-PI), '(-π, π]'); assert.equal(windowText(0), '(0, 2π]'); assert.equal(windowText(-PI / 2), '(-π/2, 3π/2]');
  assert.equal(homeLabelFor('arg z'), 'Arg z'); assert.equal(homeLabelFor('arg(z₁z₂)'), 'Arg(z₁z₂)'); assert.equal(homeLabelFor('angle'), 'angle');
});
test('seamJump', () => {
  assert.equal(seamJump(PI - 0.1, -PI + 0.1), 1); assert.equal(seamJump(-PI + 0.1, PI - 0.1), -1);
  assert.equal(seamJump(PI - 0.1, 0.5), 0); assert.equal(seamJump(1, 1.2), 0); assert.equal(seamJump(2 * PI / 3, -PI / 2), 0);
  assert.equal(seamJump(2 * PI - 0.1, 0.1), 1);              // seam 0: Arg 2π-0.1 -> 0.1 is the same kind of jump
});
test('explainer helpers', () => {
  assert.equal(sanitizeId('r^n'), 'r-n'); assert.equal(sanitizeId('ok_1-a'), 'ok_1-a'); assert.equal(sanitizeId('a b.c'), 'a-b-c');
  assert.equal(shortHeading('Cartesian (slide)'), 'Cartesian'); assert.equal(shortHeading('Polar (spin-and-stretch)'), 'Polar'); assert.equal(shortHeading('As a motion'), 'As a motion'); assert.equal(shortHeading('(x)'), '(x)');
});

// ---------------- A2
const KATEX_SRC = fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8');
function loadKatex() { delete globalThis.katex; vm.runInThisContext(KATEX_SRC); assert.equal(typeof globalThis.katex.renderToString, 'function'); }
function fakeEl() { const cls = new Set(); return { textContent: '', innerHTML: '', cls, attrs: {}, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }; }

test('A2 KaTeX renders, including the shared macros', () => {
  loadKatex(); clearTexCache();
  assert.ok(texToHtml('\\frac{2\\pi}{3}').includes('class="katex"'));
  assert.ok(texToHtml('\\frac{2\\pi}{3}', { display: true }).includes('katex-display'));
  assert.ok(!texToHtml('x^2', { mathml: false }).includes('katex-mathml'));
  assert.ok(texToHtml('x^2').includes('katex-mathml'));
  assert.ok(texToHtml('\\Arg z + \\Re z + \\Im z + \\cj{z}').includes('class="katex"'));
  assert.ok(!texToHtml('\\Re z').includes('tex-error'));
  assert.equal(texToHtml(''), ''); assert.equal(texToHtml(null), '');
});
test('A2 bad TeX never throws and is reported', () => {
  loadKatex();
  const h = texToHtml('\\badcommand{');
  assert.equal(typeof h, 'string'); assert.ok(h.includes('tex-error')); assert.ok(h.includes('\\badcommand{'));
  const el = fakeEl(); tex(el, '\\badcommand{');
  assert.equal(el.textContent, '\\badcommand{'); assert.ok(el.cls.has('tex-error'));
  const ok = fakeEl(); tex(ok, 'x^2');
  assert.ok(ok.innerHTML.includes('katex')); assert.ok(!ok.cls.has('tex-error'));
  tex(ok, '\\badcommand{'); assert.ok(ok.cls.has('tex-error')); tex(ok, 'y'); assert.ok(!ok.cls.has('tex-error'));   // the class is cleared again
  assert.doesNotThrow(() => tex(null, 'x'));
  assert.doesNotThrow(() => tex({ textContent: '', className: '' }, '\\badcommand{'));                                  // element without classList
});
test('A2 tint', () => {
  loadKatex();
  assert.match(tint('x', '--cart'), /^\\textcolor\{.+\}\{x\}$/);
  assert.equal(tint('x', '--cart'), '\\textcolor{currentColor}{x}');                 // no document in Node: KaTeX-safe fallback
  const saved = globalThis.getComputedStyle;
  try {
    globalThis.getComputedStyle = () => ({ getPropertyValue: () => ' #2563eb ' });
    assert.equal(tint('x', '--cart'), '\\textcolor{#2563eb}{x}');
    assert.equal(cart('x'), '\\textcolor{#2563eb}{x}'); assert.equal(polar('r'), '\\textcolor{#2563eb}{r}');
    assert.equal(input('a'), '\\textcolor{#2563eb}{a}'); assert.equal(output('b'), '\\textcolor{#2563eb}{b}');
    assert.ok(texToHtml(tint('x', '--cart')).includes('color:#2563eb'));
    globalThis.getComputedStyle = () => ({ getPropertyValue: () => 'rgb(1, 2, 3)' });                   // KaTeX rejects rgb(); never emit it
    assert.equal(texColor('--cart'), 'currentColor');
    assert.ok(!texToHtml(tint('x', '--cart')).includes('tex-error'));
    assert.equal(texColor('red'), 'red'); assert.equal(texColor('#abc'), '#abc'); assert.equal(texColor(''), 'currentColor');
  } finally { if (saved === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = saved; }
});
test('A2 without KaTeX', () => {
  const saved = globalThis.katex; delete globalThis.katex;
  try {
    assert.equal(texToHtml('a<b & "c"'), 'a&lt;b &amp; &quot;c&quot;');
    assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
    const el = fakeEl(); tex(el, 'x<y'); assert.equal(el.textContent, 'x<y'); assert.ok(el.cls.has('tex-error'));
  } finally { globalThis.katex = saved; }
});
```

## Appendix B: `tests/interact/i1-core-widgets.mjs` (the file on disk, synced after fix round 1: 3/3 checks pass; adapt only to match shell differences, never weaken an assertion)

```js
// tests/interact/i1-core-widgets.mjs
// Run:  node tools/smoke.mjs --route widgets-fixture --script tests/interact/i1-core-widgets.mjs --dark
// The route token is deliberately unknown: the router shows its "No such place" panel, which is a normal page,
// so this script needs the shell (index.html, KaTeX script, theme.css) but no station.
// All fixtures are built inside the page from the real modules and appended to #view (the shell's body is a grid, so a stray <body> child would get a sidebar-sized cell).

const frames = (page, n = 2) => page.evaluate((n) => new Promise((res) => {
  let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

export default async function (page, ctx) {
  const { assert, log, shot, viewport } = ctx;
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
  const attr = (sel, a) => page.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }, [sel, a]);
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const hasClass = (sel, c) => page.evaluate(([s, c]) => { const e = document.querySelector(s); return !!e && e.classList.contains(c); }, [sel, c]);
  const rect = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
  const run = (fn, arg) => page.evaluate(fn, arg);
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  // ---------------------------------------------------------------- fixtures
  await run(async () => {
    const kx = await import('./js/core/katex.js');
    const ex = await import('./js/core/explainer.js');
    const st = await import('./js/core/staircase.js');
    const sec = document.createElement('section');
    sec.id = 'iw-fixture';
    sec.style.cssText = 'padding:12px;display:grid;gap:16px;';
    sec.innerHTML = `
      <div style="width:min(720px,100%)"><div id="iw-ex-host"></div></div>
      <div style="width:320px;max-width:100%"><div id="iw-ex2-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex3-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex4-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex5-host"></div></div>
      <div style="width:min(420px,100%)"><div id="iw-st-host"></div></div>
      <div style="width:min(420px,100%)"><div id="iw-st2-host"></div></div>`;
    (document.getElementById('view') || document.body).appendChild(sec);      // inside #view: <body> is a grid in the real shell
    const { cart, polar } = kx;
    const fmt = (x) => { const s = String(Math.round(x * 1000) / 1000); return s === '-0' ? '0' : s; };
    const cx = (re, im) => `${fmt(re)} ${im < 0 ? '-' : '+'} ${fmt(Math.abs(im))}i`;
    const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    const abs = (z) => Math.hypot(z.re, z.im); const arg = (z) => Math.atan2(z.im, z.re);
    const D = (id) => document.getElementById(id);

    // E1: problem 1.1.1 (multiply) -- default columns, native badges, empty row, throwing row, bad TeX
    const rows1 = () => [
      { id: 'product', label: 'z\u2081z\u2082', native: 'polar',
        cart: (s) => { const p = mul(s.z1, s.z2); return cart(cx(p.re, p.im)); },
        polar: (s) => polar(`${fmt(abs(s.z1) * abs(s.z2))}\\,e^{i\\,${fmt(arg(s.z1) + arg(s.z2))}}`) },
      { id: 'sum', label: 'z\u2081 + z\u2082', native: 'cart',
        cart: (s) => cart(cx(s.z1.re + s.z2.re, s.z1.im + s.z2.im)),
        polar: (s) => { const z = { re: s.z1.re + s.z2.re, im: s.z1.im + s.z2.im }; return polar(`${fmt(abs(z))}\\,e^{i\\,${fmt(arg(z))}}`); } },
      { id: 'blank', label: 'nothing', cart: () => null, polar: () => '' },
      { id: 'boom', label: 'throws', cart: () => { throw new Error('boom'); }, polar: () => '\\badcommand{' },
    ];
    const same1 = (s) => { const p = mul(s.z1, s.z2); return { cart: cart(cx(p.re, p.im)), polar: polar(`${fmt(abs(p))}\\,e^{i\\,${fmt(arg(p))}}`), agree: s.agree !== false }; };
    const s0 = { z1: { re: 3, im: -2 }, z2: { re: -1, im: 4 } };
    const prevErr = console.error; const caught = []; console.error = (...a) => { caught.push(a.join(' ')); };
    const ex1 = ex.createExplainer(D('iw-ex-host'), { id: 'iw-ex', title: 'Multiply z\u2081 by z\u2082', rows: rows1(), same: same1 });
    const ex2 = ex.createExplainer(D('iw-ex2-host'), { id: 'iw-ex2', rows: rows1().slice(0, 2), same: same1 });
    ex1.update(s0); ex2.update(s0);
    console.error = prevErr;

    // E2: problem 2.1.1, f(z) = z^2 + iz in both addresses; `same` compares the two evaluations numerically
    const rows3 = [
      { id: 'expand', label: 'f(z)',
        cart: () => cart('(x+iy)^2 + i(x+iy) = (x^2 - y^2 - y) + i(2xy + x)'),
        polar: () => polar('r^2e^{2i\\theta} + re^{i(\\theta + \\pi/2)} = (r^2\\cos 2\\theta - r\\sin\\theta) + i(r^2\\sin 2\\theta + r\\cos\\theta)') },
      { id: 'u', label: 'u', cart: (s) => cart(fmt(s.x * s.x - s.y * s.y - s.y)), polar: (s) => polar(fmt(s.r * s.r * Math.cos(2 * s.t) - s.r * Math.sin(s.t))) },
      { id: 'v', label: 'v', cart: (s) => cart(fmt(2 * s.x * s.y + s.x)), polar: (s) => polar(fmt(s.r * s.r * Math.sin(2 * s.t) + s.r * Math.cos(s.t))) },
    ];
    const same3 = (s) => {
      const u1 = s.x * s.x - s.y * s.y - s.y; const v1 = 2 * s.x * s.y + s.x;
      const u2 = s.r * s.r * Math.cos(2 * s.t) - s.r * Math.sin(s.t); const v2 = s.r * s.r * Math.sin(2 * s.t) + s.r * Math.cos(s.t);
      return { cart: cart(cx(u1, v1)), polar: polar(cx(u2, v2)), agree: Math.abs(u1 - u2) < 1e-9 && Math.abs(v1 - v2) < 1e-9 };
    };
    const at = (x, y) => ({ x, y, r: Math.hypot(x, y), t: Math.atan2(y, x) });
    const ex3 = ex.createExplainer(D('iw-ex3-host'), { id: 'iw-ex3', title: 'f(z) = z\u00b2 + iz', rows: rows3, same: same3 });
    ex3.update(at(1, 1));

    // E3: problem 3.2.1, custom column keys (along dx / along dy), no native badge
    const E = (s) => Math.exp(s.x);
    const cols4 = [{ key: 'dx', heading: 'along \u0394x', tone: '--cart', short: '\u0394x' }, { key: 'dy', heading: 'along i\u0394y', tone: '--polar', short: 'i\u0394y' }];
    const ex4 = ex.createExplainer(D('iw-ex4-host'), { id: 'iw-ex4', columns: cols4,
      rows: [{ id: 'limit', label: 'f\u2032(z\u2080)',
        dx: (s) => cart(`u_x + i v_x = ${cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))}`),
        dy: (s) => polar(`v_y - i u_y = ${cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))}`) }],
      same: (s) => ({ dx: cart(cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))), dy: polar(cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))), agree: true }) });
    ex4.update({ x: 0.5, y: 0.8 });

    // E4: problem 2.2.2, three columns (the third is "as a motion")
    const cols5 = [{ key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' },
      { key: 'motion', heading: 'As a motion', tone: '--output', short: 'Motion', tint: true }];
    const ex5 = ex.createExplainer(D('iw-ex5-host'), { id: 'iw-ex5', columns: cols5,
      rows: [{ id: 'root', label: '(2i)^{1/2}', native: 'polar', cart: () => cart('1 + i'), polar: () => polar('\\sqrt{2}\\,e^{i\\pi/4}'), motion: () => ({ text: 'halve the angle, take the square root of the length' }) }] });
    ex5.update({});

    // staircases: iw-st (k -2..2, onPick) and iw-st2 (k 0..5, no onPick)
    const picks = [];
    const stairs = st.createStaircase(D('iw-st-host'), { id: 'iw-st', kMin: -2, kMax: 2, onPick: (k) => picks.push(k) });
    stairs.update(2 * Math.PI / 3);
    const stairs2 = st.createStaircase(D('iw-st2-host'), { id: 'iw-st2', kMin: 0, kMax: 5, label: 'arg c' });
    stairs2.update(0);
    window.__iw = { kx, ex, st, ex1, ex2, ex3, ex4, ex5, stairs, stairs2, picks, s0, rows1, at, caught };
  });
  await frames(page);

  // ---------------------------------------------------------------- A3: explainer
  log('explainer: structure, ids, headings, tinting (problem 1.1.1)');
  assert(await count('#iw-ex-host table.explainer') === 1, 'table.explainer rendered');
  for (const id of ['iw-ex-product-cart', 'iw-ex-product-polar', 'iw-ex-sum-cart', 'iw-ex-sum-polar', 'iw-ex-same', 'iw-ex-same-cart', 'iw-ex-same-polar']) {
    assert(await count('#' + id) === 1, `#${id} exists exactly once`);
  }
  assert((await attr('#iw-ex-product-cart', 'data-tex')).includes('5 + 14i'), 'z1 z2 = 5 + 14i');
  assert((await attr('#iw-ex-product-polar', 'data-tex')).includes('14.866') && (await attr('#iw-ex-product-polar', 'data-tex')).includes('1.228'), 'z1 z2 = 14.866 e^(i 1.228)');
  assert(await count('#iw-ex-product-cart .katex') === 1 && await count('#iw-ex-product-polar .katex') === 1, 'both cells are KaTeX');
  assert((await text('#iw-ex-same')).includes('same point: agree') && await attr('#iw-ex-same', 'data-agree') === 'true', 'footer: same point: agree');
  assert((await text('#iw-ex-host caption')) === 'Multiply z\u2081 by z\u2082', 'title is the table caption');
  assert(await attr('#iw-ex-host table', 'role') === 'table' && await count('#iw-ex-host th[scope="row"]') >= 5, 'explicit table roles and row headers');
  const colours = await run(() => {
    const probe = (v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const th = (c) => getComputedStyle(document.querySelector(`#iw-ex-host thead th[data-col="${c}"]`)).color;
    const inner = (id) => { const s = document.querySelector(`#${id} .katex-html [style*="color"]`); return s ? getComputedStyle(s).color : null; };
    return { cart: probe('--cart'), polar: probe('--polar'), thCart: th('cart'), thPolar: th('polar'), tintCart: inner('iw-ex-product-cart'), tintPolar: inner('iw-ex-product-polar') };
  });
  assert(colours.cart !== colours.polar, '--cart and --polar differ');
  assert(colours.thCart === colours.cart && colours.thPolar === colours.polar, `column headings use the tone tokens ${JSON.stringify(colours)}`);
  assert(colours.tintCart === colours.cart && colours.tintPolar === colours.polar, `tinted TeX equals the tokens ${JSON.stringify(colours)}`);
  const headText = await text('#iw-ex-host thead');
  assert(headText.includes('Cartesian (slide)') && headText.includes('Polar (spin-and-stretch)'), 'default headings');
  assert((await text('#iw-ex-host tr[data-row="product"] .ex-native')) === 'easy in Polar', 'native badge on the product row');
  assert(await attr('#iw-ex-product-polar', 'data-native') === 'true' && await attr('#iw-ex-product-cart', 'data-native') === 'false', 'native flags on cells');

  log('explainer: empty and error cells never break the table');
  assert((await text('#iw-ex-blank-cart')) === '\u2014' && await hasClass('#iw-ex-blank-cart', 'is-empty'), 'null and empty TeX show an em dash');
  assert((await text('#iw-ex-boom-cart')) === 'n/a' && await hasClass('#iw-ex-boom-cart', 'tex-error'), 'a throwing row function shows n/a');
  assert(await hasClass('#iw-ex-boom-polar', 'tex-error') && (await text('#iw-ex-boom-polar')) === '\\badcommand{', 'bad TeX shows its source with tex-error');
  assert(await run(() => window.__iw.caught.length === 1 && /boom/.test(window.__iw.caught[0])), 'the row exception was logged once');

  log('explainer: layout, side by side vs stacked (container width and viewport)');
  const place = async (pre, row) => ({ a: await rect(`#${pre}-${row}-cart`), b: await rect(`#${pre}-${row}-polar`), w: (await rect(`#${pre}-${row}-cart`)) && (await rect(`#${pre}-table`)).w });
  for (const [pre, row] of [['iw-ex', 'product'], ['iw-ex2', 'product']]) {
    const { a, b, w } = await place(pre, row);
    const stacked = viewport.width <= 560 || w <= 560;
    if (stacked) assert(b.t >= a.b - 1 && Math.abs(a.l - b.l) < 2, `${pre} stacked (table ${Math.round(w)}px, viewport ${viewport.width}px)`);
    else assert(Math.abs(a.t - b.t) < 2 && b.l >= a.r - 1, `${pre} side by side (table ${Math.round(w)}px)`);
  }
  const narrow = await place('iw-ex2', 'product');
  assert(narrow.b.t >= narrow.a.b - 1, 'a 320px container stacks even on a wide viewport (container query)');
  if (viewport.width >= 800) { const wide = await place('iw-ex', 'product'); assert(Math.abs(wide.a.t - wide.b.t) < 2, 'a 720px container is side by side on a wide viewport'); }
  assert(await run(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal page overflow with all fixtures');
  if (viewport.width >= 800) {                                      // a live resize flips the layout (ResizeObserver), no re-create needed
    await run(() => { document.getElementById('iw-ex2-host').parentElement.style.width = 'min(720px,100%)'; });
    await frames(page, 3);
    const grown = await place('iw-ex2', 'product');
    assert(Math.abs(grown.a.t - grown.b.t) < 2 && grown.b.l >= grown.a.r - 1, 'growing the container from 320px to 720px switches to side by side');
    await run(() => { document.getElementById('iw-ex2-host').parentElement.style.width = '320px'; });
    await frames(page, 3);
    const shrunk = await place('iw-ex2', 'product');
    assert(shrunk.b.t >= shrunk.a.b - 1, 'and shrinking it back stacks again');
  }

  log('explainer: coalescing, skipping unchanged TeX, live update');
  const base = await run(() => ({ ...window.__iw.ex1.stats }));
  const mid = await run(() => { const e = window.__iw.ex1; for (let i = 0; i < 50; i++) e.update({ z1: { re: 1, im: i % 2 }, z2: { re: 1, im: 1 } }); return { ...e.stats }; });
  assert(mid.renders === base.renders, 'update() after the first never renders synchronously');
  await page.waitForFunction((n) => window.__iw.ex1.stats.renders >= n, base.renders + 1, { timeout: 3000 });
  await page.waitForTimeout(600);                                   // past the 220 ms refine pass
  const after = await run(() => ({ ...window.__iw.ex1.stats }));
  assert(after.renders === base.renders + 1, `50 updates in one task make exactly 1 render (got ${after.renders - base.renders})`);
  assert(after.refines === base.refines + 1, `and exactly 1 idle refine pass (got ${after.refines - base.refines})`);
  const cw = await run(() => { const e = window.__iw.ex1; const a = e.stats.cellWrites; const S = { z1: { re: 2, im: 1 }, z2: { re: 1, im: 1 } };
    e.update(S); e.flush(); const b = e.stats.cellWrites; e.update({ z1: { ...S.z1 }, z2: { ...S.z2 } }); e.flush(); return { a, b, c: e.stats.cellWrites }; });
  assert(cw.b > cw.a && cw.c === cw.b, `unchanged TeX is not re-rendered ${JSON.stringify(cw)}`);
  assert((await attr('#iw-ex-product-cart', 'data-tex')).includes('1 + 3i'), '(2 + i)(1 + i) = 1 + 3i in Cartesian');
  assert((await attr('#iw-ex-product-polar', 'data-tex')).includes('3.162\\,e^{i\\,1.249}'), '... and sqrt(10) e^(i 1.249) in polar');

  log('explainer: same-point verdicts');
  await run(() => { window.__iw.ex1.update({ ...window.__iw.s0, agree: false }); window.__iw.ex1.flush(); });
  assert((await text('#iw-ex-same')).includes('same point: differ') && await attr('#iw-ex-same', 'data-agree') === 'false', 'differ');
  await run(() => { window.__iw.ex1.update(window.__iw.s0); window.__iw.ex1.flush(); });
  assert((await text('#iw-ex-same')).includes('same point: agree'), 'agree again');

  log('explainer: setRows keeps the last state');
  await run(() => window.__iw.ex1.setRows(window.__iw.rows1().slice(1, 2)));
  assert(await count('#iw-ex-product-cart') === 0 && await count('#iw-ex-sum-cart') === 1, 'setRows replaced the rows');
  assert((await attr('#iw-ex-sum-cart', 'data-tex')).includes('2 + 2i'), 'the new row rendered with the last state: z1 + z2 = 2 + 2i');
  await run(() => window.__iw.ex1.setRows(window.__iw.rows1()));

  log('explainer: problem 2.1.1, both addresses agree at three points');
  const checks211 = [[[1, 1], '-1', '3'], [[0, 2], '-6', '0'], [[-1, 0], '1', '-1']];
  for (const [[x, y], u, v] of checks211) {
    await run(([x, y]) => { window.__iw.ex3.update(window.__iw.at(x, y)); window.__iw.ex3.flush(); }, [x, y]);
    for (const col of ['cart', 'polar']) {
      assert((await attr(`#iw-ex3-u-${col}`, 'data-tex')).endsWith(`{${u}}`) && (await attr(`#iw-ex3-v-${col}`, 'data-tex')).endsWith(`{${v}}`), `z = ${x}+${y}i ${col}: u = ${u}, v = ${v}`);
    }
    assert(await attr('#iw-ex3-same', 'data-agree') === 'true', `z = ${x}+${y}i: same point agrees`);
  }
  assert(await count('#iw-ex3-table .tex-error') === 0, 'the u + iv formulas in both addresses are valid KaTeX');
  assert((await attr('#iw-ex3-expand-polar', 'data-tex')).includes('\\cos 2\\theta'), 'the polar derivation row is present');

  log('explainer: a static cell keeps its MathML while updates stream (no downgrade, no wasted write)');
  const r0 = await run(() => {
    const w = window.__iw; w.ex3.update(w.at(1, 1)); w.ex3.flush();
    w.keep = document.querySelector('#iw-ex3-expand-cart .katex');
    w.ex3.update(w.at(1.2, 1)); w.ex3.update(w.at(1.4, 1));
    return w.ex3.stats.renders;
  });
  await page.waitForFunction((n) => window.__iw.ex3.stats.renders > n, r0, { timeout: 3000 });
  assert(await run(() => { const k = window.__iw.keep; return !!k && document.querySelector('#iw-ex3-expand-cart .katex') === k && !!k.querySelector('.katex-mathml'); }), 'a streaming render leaves the unchanged derivation cell as it was (same node, MathML intact)');
  await page.waitForTimeout(400);                                   // past the refine pass
  assert(await run(() => document.querySelector('#iw-ex3-expand-cart .katex') === window.__iw.keep), 'the refine pass leaves the unchanged cell untouched');
  assert((await attr('#iw-ex3-u-cart', 'data-tex')).endsWith('{-0.04}') && (await attr('#iw-ex3-v-cart', 'data-tex')).endsWith('{4.2}'), 'and the changed cells show the latest state: u = -0.04, v = 4.2 at 1.4 + i');
  await run(() => { const w = window.__iw; delete w.keep; w.ex3.update(w.at(-1, 0)); w.ex3.flush(); });

  log('explainer: problem 3.2.1, custom column keys');
  assert(await count('#iw-ex4-limit-dx') === 1 && await count('#iw-ex4-limit-dy') === 1 && await count('#iw-ex4-same-dx') === 1, 'ids use the custom keys');
  assert((await text('#iw-ex4-table thead')).includes('along \u0394x') && (await text('#iw-ex4-table thead')).includes('along i\u0394y'), 'custom headings');
  assert((await attr('#iw-ex4-limit-dx', 'data-tex')).includes('1.149 + 1.183i') && (await attr('#iw-ex4-limit-dy', 'data-tex')).includes('1.149 + 1.183i'), "f'(0.5+0.8i) = 1.149 + 1.183i along both axes");
  assert(await attr('#iw-ex4-same', 'data-agree') === 'true', 'the two limits agree');

  log('explainer: problem 2.2.2, three columns');
  assert(await count('#iw-ex5-table thead th[data-col]') === 3 && await count('#iw-ex5-root-motion') === 1, 'third column present');
  assert((await text('#iw-ex5-root-motion')) === 'halve the angle, take the square root of the length' && await count('#iw-ex5-root-motion .katex') === 0 && await hasClass('#iw-ex5-root-motion', 'ex-tinted'), 'third column: { text } renders as plain prose, tinted by its tone');
  assert((await text('#iw-ex5-table tr[data-row="root"] .ex-native')) === 'easy in Polar', 'native badge on the root row');
  if (viewport.width >= 800) { const a = await rect('#iw-ex5-root-cart'), b = await rect('#iw-ex5-root-polar'), c = await rect('#iw-ex5-root-motion'); assert(Math.abs(a.t - c.t) < 2 && c.l >= b.r - 1, 'three columns side by side'); }

  log('advisory: contrast of the tone tokens on --surface (logged, not a gate: the tokens belong to the shell goal)');
  const contrast = await run(() => {
    const rgb = (v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color.match(/[\d.]+/g).map(Number); p.remove(); return c; };
    const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const bg = rgb('--surface'); const out = {};
    for (const t of ['--cart', '--polar', '--output', '--text', '--text-muted', '--ok', '--warn', '--danger']) out[t] = +ratio(rgb(t), bg).toFixed(2);
    return out;
  });
  for (const [t, r] of Object.entries(contrast)) if (r < 4.5) log(`WARNING ${t} has contrast ${r}:1 on --surface (< 4.5:1); small tinted text will be hard to read`);
  log(`contrast on --surface: ${JSON.stringify(contrast)}`);

  log('katex: colour tokens in any CSS syntax become something KaTeX accepts');
  const cc = await run(() => {
    const kx = window.__iw.kx;
    document.documentElement.style.setProperty('--iw-oklch', 'oklch(0.6 0.2 260)');
    const out = { rgb: kx.texColor('rgb(37, 99, 235)'), hex4: kx.texColor('#abcd'), oklch: kx.texColor('--iw-oklch'), missing: kx.texColor('--iw-no-such-token'),
      okRender: !kx.texToHtml(kx.tint('x', '--iw-oklch')).includes('tex-error') && !kx.texToHtml(kx.tint('x', '--iw-no-such-token')).includes('tex-error') };
    document.documentElement.style.removeProperty('--iw-oklch');
    return out;
  });
  assert(cc.rgb === '#2563eb' && cc.hex4 === '#aabbcc' && /^#[0-9a-f]{6}$/.test(cc.oklch) && cc.missing === 'currentColor' && cc.okRender, `texColor ${JSON.stringify(cc)}`);

  log('explainer: theme switch re-tints the cells');
  await run(() => document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  await frames(page, 4);
  const themed = await run(() => {
    const p = document.createElement('span'); p.style.color = 'var(--cart)'; document.body.appendChild(p); const want = getComputedStyle(p).color; p.remove();
    const s = document.querySelector('#iw-ex-product-cart .katex-html [style*="color"]');
    return { want, got: s ? getComputedStyle(s).color : null };
  });
  assert(themed.got === themed.want, `after a theme switch the tint follows --cart ${JSON.stringify(themed)}`);
  await shot('theme-flipped');
  await run(() => document.documentElement.removeAttribute('data-theme'));
  await frames(page, 4);

  // ---------------------------------------------------------------- A4: staircase
  log('staircase: problem 1.3.1, z = -1 + i sqrt3, Arg z = 2pi/3');
  assert((await text('#iw-st-arg')) === 'Arg z = 2.094 (2\u03c0/3)', `readout ${await text('#iw-st-arg')}`);
  assert((await text('#iw-st-set')) === 'arg z = { 2\u03c0/3 + 2\u03c0k : k is any integer }', 'the set is stated');
  assert(await count('#iw-st-list > li') === 5 && await count('#iw-st-list > li.is-home') === 1 && await hasClass('#iw-st-k0', 'is-home'), 'five steps, exactly one home step (k = 0)');
  const rowText = async (id) => (await text(`#${id} .stair-prefix`)) + (await text(`#${id} .stair-text`));
  const expected = { '-2': '2\u03c0/3 - 4\u03c0 = -10\u03c0/3', '-1': '2\u03c0/3 - 2\u03c0 = -4\u03c0/3', 0: 'Arg z = 2\u03c0/3', 1: '2\u03c0/3 + 2\u03c0 = 8\u03c0/3', 2: '2\u03c0/3 + 4\u03c0 = 14\u03c0/3' };
  for (const [k, t] of Object.entries(expected)) assert((await rowText(`iw-st-k${k}`)) === t, `step k = ${k}: "${await rowText(`iw-st-k${k}`)}" should be "${t}"`);
  assert((await text('#iw-st-k1 .stair-dec')) === '8.378' && (await text('#iw-st-k-2 .stair-dec')) === '-10.472', 'decimals beside the exact forms');
  assert((await attr('#iw-st-host .staircase-home', 'data-window')) === '(-\u03c0, \u03c0]' && (await text('#iw-st-window')).includes('(-\u03c0, \u03c0]'), 'the home window (-pi, pi] is stated');
  const encloses = async (stairsSel, rowSel) => { const b = await rect(`${stairsSel} .staircase-home`), r = await rect(rowSel); return Math.abs(b.t - r.t) < 1.5 && Math.abs(b.b - r.b) < 1.5; };
  assert(await encloses('#iw-st-host', '#iw-st-k0'), 'the shaded band sits exactly behind the home row');

  log('staircase: any representative gives the same list; problem 1.3.2 wraps 10pi/6 to -pi/3');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3 + 4 * Math.PI));
  assert((await text('#iw-st-arg')) === 'Arg z = 2.094 (2\u03c0/3)' && await hasClass('#iw-st-k0', 'is-home'), '14pi/3 is just another name for 2pi/3');
  await run(() => window.__iw.stairs.update(-Math.PI));
  assert((await text('#iw-st-arg')) === 'Arg z = 3.142 (\u03c0)', '-pi is reported as pi (the window is (-pi, pi])');
  await run(() => window.__iw.stairs.update(10 * Math.PI / 6));
  assert((await text('#iw-st-arg')) === 'Arg z = -1.047 (-\u03c0/3)', '10pi/6 = 5pi/3 wraps to -pi/3');
  assert((await rowText('iw-st-k1')) === '-\u03c0/3 + 2\u03c0 = 5\u03c0/3' && (await rowText('iw-st-k-1')) === '-\u03c0/3 - 2\u03c0 = -7\u03c0/3', '5pi/3 is the step above -pi/3');

  log('staircase: problem 2.2.2, Arg(2i) = pi/2 is the home step, 5pi/2 is the other name');
  await run(() => window.__iw.stairs.update(Math.PI / 2));
  assert((await text('#iw-st-arg')) === 'Arg z = 1.571 (\u03c0/2)' && (await rowText('iw-st-k1')) === '\u03c0/2 + 2\u03c0 = 5\u03c0/2', 'pi/2 and pi/2 + 2pi');

  log('staircase: problem 1.4.1, the staircase of c = 1 (k = 0..5, no onPick, label arg c)');
  assert((await text('#iw-st2-arg')) === 'Arg c = 0' && await count('#iw-st2-list > li') === 6 && await count('#iw-st2-list button') === 0, 'Arg c = 0, six steps, no buttons without onPick');
  assert((await rowText('iw-st2-k1')) === '0 + 2\u03c0 = 2\u03c0' && (await rowText('iw-st2-k5')) === '0 + 10\u03c0 = 10\u03c0' && await hasClass('#iw-st2-k0', 'is-home'), 'steps 2pi ... 10pi; k = 0 is home');
  assert(await encloses('#iw-st2-host', '#iw-st2-k0'), 'the band follows the home row even when it is the bottom row');

  log('staircase: movable seam; problem 2.4.1, the window (0, 2pi] is continuous across the negative real axis');
  await run(() => { const s = window.__iw.stairs; s.setSeam(0); s.update(-Math.PI / 2); });
  assert((await text('#iw-st-arg')) === 'Arg z = 4.712 (3\u03c0/2)' && (await text('#iw-st-window')).includes('(0, 2\u03c0]'), 'seam 0: -pi/2 is named 3pi/2 in the window (0, 2pi]');
  assert(await encloses('#iw-st-host', '#iw-st-k0') && await hasClass('#iw-st-k0', 'is-home') && (await rowText('iw-st-k0')) === 'Arg z = 3\u03c0/2', 'a moved seam does not move the band: it stays on k = 0 and the labels re-anchor');
  await run(() => { const s = window.__iw.stairs; s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001); });
  assert((await text('#iw-st-arg')) === 'Arg z = 3.143' && await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '0', 'seam 0: crossing the negative real axis is continuous (3.141 then 3.143), no jump');
  await run(() => { const s = window.__iw.stairs; s.setSeam(-Math.PI); s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001); });
  assert((await text('#iw-st-arg')) === 'Arg z = -3.141' && await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '1', 'principal seam: the same crossing jumps from 3.141 to -3.141');
  assert((await text('#iw-st-note')).includes('Seam crossed: Arg z dropped by 2\u03c0. The set arg z did not move.'), 'the note says what happened');
  await run(() => window.__iw.stairs.update(0.5));
  assert(await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '1', 'a big move that is not a seam crossing is not counted');
  assert((await rowText('iw-st-k1')) === '0.5 + 2\u03c0' && (await text('#iw-st-k1 .stair-dec')) === '6.783' && (await text('#iw-st-k-1 .stair-text')) === '0.5 - 2\u03c0', 'no exact form: the row omits the "= decimal" tail, the decimal column carries it');
  assert((await attr('#iw-st-k1 button', 'aria-label')) === 'step k = 1: 0.5 + 2\u03c0 = 6.783', 'but the accessible name still says the total');

  log('staircase: picking, roving focus, keyboard');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));
  await page.click('#iw-st-k1 button');
  assert(await run(() => JSON.stringify(window.__iw.picks)) === '[1]' && await attr('#iw-st-k1 button', 'aria-pressed') === 'true' && await hasClass('#iw-st-k1', 'is-picked'), 'click picks step 1');
  assert((await attr('#iw-st-k1 button', 'aria-label')) === 'step k = 1: 2\u03c0/3 + 2\u03c0 = 8\u03c0/3', 'accessible name of a step');
  assert(await count('#iw-st-list button[tabindex="0"]') === 1, 'one tab stop (roving tabindex)');
  await page.focus('#iw-st-k0 button');
  const ringOf = (sel) => run((s) => {
    const b = document.querySelector(s), c = getComputedStyle(b);
    const p = document.createElement('span'); p.style.color = 'var(--focus)'; document.body.appendChild(p); const focus = getComputedStyle(p).color; p.remove();
    return { focused: document.activeElement === b, outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineColor: c.outlineColor, mark: c.boxShadow, focus };
  }, sel);
  const pickedIdle = await ringOf('#iw-st-k1 button');                // picked, not focused
  assert(!pickedIdle.focused && pickedIdle.outlineStyle === 'none' && pickedIdle.mark !== 'none', `picked and not focused: the picked mark is not an outline ${JSON.stringify(pickedIdle)}`);
  await page.keyboard.press('ArrowUp');
  assert(await run(() => document.activeElement.closest('li').id) === 'iw-st-k1', 'ArrowUp moves to the next higher step');
  const pickedFocused = await ringOf('#iw-st-k1 button');             // picked and keyboard focused
  assert(pickedFocused.focused && pickedFocused.outline !== pickedIdle.outline && pickedFocused.outlineStyle === 'solid' && pickedFocused.outlineWidth === '3px' && pickedFocused.outlineColor === pickedFocused.focus,
    `a focused, picked step shows the 3px --focus ring, distinct from the picked mark ${JSON.stringify(pickedFocused)}`);
  assert(pickedFocused.mark === pickedIdle.mark && pickedFocused.mark !== 'none', 'and the picked mark is still drawn under the ring');
  await page.keyboard.press('ArrowDown');
  const plainFocused = await ringOf('#iw-st-k0 button');              // not picked, keyboard focused
  assert(plainFocused.focused && plainFocused.outlineStyle === 'solid' && plainFocused.outlineWidth === '3px' && plainFocused.outlineColor === plainFocused.focus && plainFocused.mark === 'none', `a focused, unpicked step shows the ring and no picked mark ${JSON.stringify(plainFocused)}`);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  assert(await run(() => document.activeElement.closest('li').id) === 'iw-st-k-2', 'End moves to the lowest step');
  await page.keyboard.press('Enter');
  assert(await run(() => JSON.stringify(window.__iw.picks)) === '[1,-2]', 'Enter picks the focused step');
  await run(() => window.__iw.stairs.setPicked(null));
  assert(await count('#iw-st-list li.is-picked') === 0, 'setPicked(null) clears the highlight');

  log('staircase: z = 0 has no angle');
  await run(() => window.__iw.stairs.update(null));
  assert((await text('#iw-st-arg')) === 'Arg z = undefined' && await count('#iw-st-list > li.is-home') === 0 && (await text('#iw-st-window')).includes('The point 0 has no angle'), 'undefined state');
  const bandAt0 = await run(() => { const w = document.querySelector('#iw-st-host .staircase-wrap'); return { display: getComputedStyle(w.querySelector('.staircase-home')).display, flag: w.getAttribute('data-home-visible') }; });
  assert(bandAt0.display === 'none' && bandAt0.flag === 'false', `z = 0: no home row, so the shaded band is hidden too ${JSON.stringify(bandAt0)}`);
  assert((await text('#iw-st-k0 .stair-text')) === '\u2014' && await count('#iw-st-list > li.is-empty') === 5, 'z = 0: every row shows an em dash');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));
  assert(await count('#iw-st-list > li.is-home') === 1, 'recovers');
  const bandBack = await run(() => { const w = document.querySelector('#iw-st-host .staircase-wrap'); return { display: getComputedStyle(w.querySelector('.staircase-home')).display, flag: w.getAttribute('data-home-visible') }; });
  assert(bandBack.display === 'block' && bandBack.flag === 'true' && await encloses('#iw-st-host', '#iw-st-k0'), `on the next number the band is back behind the home row ${JSON.stringify(bandBack)}`);
  const outside = await run(() => {                                  // home step outside kMin..kMax: no row is home, no band
    const host = document.createElement('div'); document.getElementById('iw-fixture').appendChild(host);
    const s = window.__iw.st.createStaircase(host, { id: 'iw-st3', kMin: 1, kMax: 3 }); s.update(0.5);
    const out = { display: getComputedStyle(host.querySelector('.staircase-home')).display, homes: host.querySelectorAll('li.is-home').length, arg: host.querySelector('#iw-st3-arg').textContent };
    s.destroy(); host.remove(); return out;
  });
  assert(outside.display === 'none' && outside.homes === 0 && outside.arg === 'Arg z = 0.5', `home step outside the rows: band hidden, Arg readout still right ${JSON.stringify(outside)}`);

  log('reduced motion: the band never slides; the seam-crossing pulse on the Arg line is the only motion');
  const pulse = () => run(() => {
    const s = window.__iw.stairs; s.setSeam(-Math.PI); s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001);    // a seam crossing adds is-jump to the wrap
    const w = document.querySelector('#iw-st-host .staircase-wrap');
    return { jump: w.classList.contains('is-jump'), anim: getComputedStyle(w.querySelector('.stair-arg')).animationName, slide: parseFloat(getComputedStyle(w.querySelector('.staircase-home')).transitionDuration) };
  });
  const motion = await pulse();
  assert(motion.jump && motion.anim === 'stair-pulse' && motion.slide === 0, `normal motion: the Arg line pulses on a seam crossing, the band has no transition ${JSON.stringify(motion)}`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(() => window.__iw.stairs.update(0.5));
  const still = await pulse();
  assert(still.jump && still.anim === 'none' && still.slide <= 0.001, `reduced motion: no pulse, still no slide (0s from the widget, 1e-05s under the shell global rule) ${JSON.stringify(still)}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));

  await shot('fixtures');

  log('setLabel and destroy');
  await run(() => window.__iw.stairs.setLabel('arg w'));
  assert((await text('#iw-st-arg')).startsWith('Arg w = ') && (await text('#iw-st-set')).startsWith('arg w = {'), 'label follows setLabel');
  await run(() => { const w = window.__iw; for (const k of ['ex1', 'ex2', 'ex3', 'ex4', 'ex5']) w[k].destroy(); w.stairs.destroy(); w.stairs2.destroy(); w.ex1.update({}); w.stairs.update(1); w.ex1.destroy(); });
  assert(await count('#iw-fixture .explainer-wrap, #iw-fixture .staircase-wrap') === 0, 'destroy removes the DOM and later calls are harmless');
  assert(consoleErrors.length === 0, `no console errors: ${consoleErrors.join(' | ')}`);
  await run(() => { delete window.__iw; document.getElementById('iw-fixture').remove(); });
}
```

---

## Appendix C: builder notes (iteration 1)

The three modules, the unit test (Appendix A, verbatim) and the interaction script (Appendix B plus one added step) were built from this document. Deviations, each the smallest change that makes the behaviour right:

1. `explainer.js` CSS, `thead th.ex-corner { width: 7.5rem; }` added. With `table-layout: fixed` the column widths come from the first row (the header), so the `.ex-rowlabel { width: 7.5rem }` rule alone left three equal columns. The corner width gives the documented 7.5rem row-label column.
2. `explainer.js` CSS, `.explainer .ex-native[hidden] { display: none; }` added. `.ex-native { display: block }` overrides the user-agent `[hidden]` rule, so an empty badge would otherwise still take a line of height.
3. `explainer.js` CSS, `font-family: var(--font, inherit);` added to the stacked `td.ex-cell::before` rule, so the column heading above an error cell is not set in the error cell's monospace font.
4. `explainer.js` `writeCell`: while updates stream (`fast`), a TeX cell whose current key is the full-quality key for the same TeX is skipped instead of being re-rendered without MathML. Without this, an unchanged (static) cell, for example a derivation row, was downgraded on the first streaming render and upgraded again by the refine pass. Section 5.2 step 13 (refine) is unchanged. Pinned by the extra interaction step "a static cell keeps its MathML while updates stream" (fails if the guard is removed).
5. `explainer.js` `classify`: a plain object without a string `.text` is an empty cell (em dash), not `String(obj)`. The design only pins `{ text }`; `[object Object]` on screen helps nobody.
6. `staircase.js`: more than 25 rows are cut to 25 around k = 0 (the window `max(kMin, min(-12, kMax - 24))` .. +24) rather than from the top, so the home step survives. The design only says "cut to 25".
7. Appendix B gained one step (after the 2.1.1 checks): "a static cell keeps its MathML while updates stream". No existing assertion was changed.

## Appendix D: fix round 1 (reviewer findings against the first delivery)

Appendices A and B above were re-synced to the files on disk, so the design, the unit test and the interaction script no longer drift. Changes, by finding:

1. **z = 0 left the band on screen (major).** `render()` now sets `data-home-visible` to `homeVisible && theta !== null`, so the shaded band and its 4px bar disappear together with the home row in the undefined state, and come back on the next number. Section 5.3 step 5 now says so (it previously set the flag from the k range only, which contradicted section 2.2). Interaction step 22 asserts the computed `display` is `none` at z = 0 and `block` after, and that a staircase without a k = 0 row has no band. Verified by mutation: with the old line restored the script fails at that step.
2. **Picked mark hid the focus ring (major).** The picked mark moved from `outline` to an inset `box-shadow` (`inset 0 0 0 2px var(--polar)`), so `outline` is the focus ring's alone. On a focused, picked row the ring uses `outline-offset: -5px`, which puts it just inside the 2px mark: both show. Interaction step 21 compares computed `outline` and `box-shadow` for picked-unfocused, picked-focused and unpicked-focused rows. Verified by mutation: with the outline restored the script fails (`outline: solid 2px` while unfocused).
3. **`npm test` fails on Node 22 (minor, not this goal's file).** Request for the `package.json` owner (section 10, item 1), unchanged. This goal's tests pass by glob: `node --test tests/unit/*.test.mjs`.
4. **The band never slides (minor, design text was wrong).** Rows are anchored to the home step (D3), so `k = 0` is always the home row. The design sentence is corrected (2.2, 8, D3), and the dead `transition: top .18s` and its reduced-motion override are removed from the CSS. Interaction step 20 asserts the band still encloses k = 0 after `setSeam(0)`; step 23 now tests the one real animation (the Arg-line pulse: `stair-pulse` normally, `none` under reduced motion) and that the band has no transition.
5. **Caption and grid had two outlines (minor).** Border, radius, clip and surface moved from `table.explainer` to `div.explainer-wrap`, so the caption and the grid share one outline in both layouts. The initial stacked-layout width now reads `wrap.clientWidth` (the content box, the same number the `ResizeObserver` reports), because the wrapper now has a 1px border.
6. **Long rows truncated at 320px (minor, taken).** `stepText` omits the `= decimal` tail when the total has no exact form (`0.7 + 2π`; the decimal column shows `6.983`). The new `full` field keeps the total in the accessible name. Unit tests updated (rows `[0.7, 1]`, `[0.7, -1]`, `[3.142, 5]`, plus a `full` test); interaction step 20 asserts the row text, the decimal column and the `aria-label`. ARCHITECTURE 3.8 ("exact-π form when it exists") is consistent with this.
7. **Footer label wrapped to three lines (minor).** `.ex-same-label` is a block and the verdict (disc and word) is `white-space: nowrap`, with a smaller disc and a narrower right padding on the footer's row-label cell, so `same point:` / `● not checked` is two lines in the 7.5rem column. The stacked layout keeps `same point: ● agree` on one line.
8. **Performance (minor, no change).** Unchanged: the adaptive throttle works; a station explainer should stay near six rows on a slow phone. Warming the KaTeX cache at mount was considered and not done: the first `update()` renders synchronously in the same task as mount, so an idle-time warm-up would not run before it, and a synchronous one only moves the cost.
9. **Goal text versus D1 (minor, not this goal's file).** Request for the orchestrator (section 10, item 1a): amend the `interfaces` line of the goal.
10. **Missing assertions (minor).** Added as described in items 1, 2, 4 and 6; the two major defects are now caught by the script.
