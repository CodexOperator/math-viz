# Design: i2-media-core

Goal `i2-media-core` (iteration 2, wave 0, kind `engine`, size S): the media layer. `js/core/listen.js` (manifest, video panel, Listen
control), `videos/lib/palette.py` brought in line with the dark theme tokens, and six narration scripts (`home`, `staircase`, `roots`,
`derivative`, `lab`, and the Walk's 22 sentences).

Owned files (the only ones this goal may create or edit): `js/core/listen.js`, `videos/lib/palette.py`,
`media/narration/site/home.json`, `staircase.json`, `roots.json`, `derivative.json`, `lab.json`, `walk.json`, and, automatically as in
every goal, this file, `tests/unit/i2-media-core.test.mjs` and `tests/interact/i2-media-core.mjs`. Everything else that this design
needs from another owner is in section 9 ("Requests for other owners"); none of it blocks the goal.

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md` (Media track), `docs/STORY.md` (0, 2, 4, 8), `docs/ARCHITECTURE.md` (1, 9
"Iteration 2", 11.4, 11.8), `docs/goals/iter-2.json` (entry `i2-media-core`, plus the three video goals that consume the palette),
`tools/videos/render.mjs` (the manifest it writes), `tools/media/generate-audio.mjs` (how narration JSON becomes clips),
`videos/lib/narrated.py`, `videos/lib/palette.py`, `css/theme.css`, `css/components.css`, `js/registry.js` (the 22 `walk.say`
sentences), `js/core/theme.js` and `js/core/plane.js` (code style, `mixColor`/`rampMix`), `tools/smoke.mjs` and
`tests/interact/_helpers.mjs` (how scripts run), `tests/unit/architecture-sync.test.mjs` (the rules `listen.js` must satisfy).

Status of this design. Nothing is built in the repo yet: `js/core/listen.js` does not exist, `media/narration/site/` is empty,
`media/manifest.js` exports `VIDEOS = []` and `SITE_AUDIO = {}`, and `videos/lib/palette.py` holds eight constants whose values are
not the dark tokens. To make sure the design is implementable without guessing, a **throwaway prototype** of everything in this
document was built in a scratch copy of the repo (outside the repo; informational, it may not exist when you read this, and this
document is binding where they differ): `listen.js` written from sections 4 and 5, `palette.py`, the six narration files, the unit
test of 7.2 and the interaction script of 7.3. Results: the 10 unit cases pass (the full suite goes from 801 tests with the same 9
known-red ones to 811 with the same 9, so nothing that was green turned red, including `architecture-sync`); the script passes at
all three harness views (`3/3 checks passed across 1 route(s).`, 8 expected error lines ignored per view); real audio plays in the
harness's headless Chromium from a `blob:` WAV (the happy path of step 6 ran, not the error fallback); the video panel measures
918 × 516 px at 1280 and 324 × 182 px at 390 (16:9); every number in section 6 was recomputed with the real `js/core/complex.js`;
every narration text was run through a checker for the acceptance rules (word counts under two counters, forbidden characters,
pins, both addresses); and the palette helper values of 7.2 U2 are the ones Python printed.

---

## 0. Decisions, discrepancies, and differences from the plan

### 0.1 Decisions a builder or reviewer might otherwise trip over

| # | Decision | Why |
|---|---|---|
| D1 | `listen.js` exports **exactly six functions**: `loadManifest`, `videoFor`, `clipsFor`, `videoPanel`, `listenControl`, `resetManifestCache`, with the parameter lists of ARCHITECTURE 11.4 character for character (including the en dash in `'Watch (2–3 min)'`). The `Listen` object and the `Manifest` are shapes, not exports. | `tests/unit/architecture-sync.test.mjs` compares parameter lists with the code once the integrator moves 11.4 into section 3, and fails on any export the section does not mention. Section 7 test U9 runs the same comparison now. |
| D2 | **No `<style>` injection and no occurrence of the string `data-for` anywhere in the file, comments included.** The module needs no CSS to be correct: it uses classes that exist today (`panel`, `panel-title`, `muted`, `btn`, `btn-quiet`), puts the only layout it needs inline on the `<video>` (width, 16:9, token background), and shows every state in text (section 2.4). The nicer styling is a recommended CSS block for `css/components.css` (section 9), which the shell goal owns. | The sync test greps every `js/core/*.js` file for `data-for` and expects only the style-injecting modules; ARCHITECTURE 1 says `listen.js` puts its rules in `components.css`. A module that works without that file cannot be broken by goal ordering. |
| D3 | `loadManifest` is **not** an `async function`: it returns one cached promise (`loadManifest() === loadManifest()`), made by a private async `readManifest`. | Acceptance A3 asserts promise identity; an `async function` would wrap in a new promise on every call. |
| D4 | The manifest is **normalised once** when loaded (malformed entries dropped, defaults filled, one `console.warn` if anything was dropped), so every later reader can trust the shape. `videoFor` and `clipsFor` stay pure and lenient (they look up, they do not validate: `clipsFor` returns a clip that has only an `id`, as A3 requires). `videoPanel` and `listenControl` apply the strict checks (a `src` string) before they build anything. | A generated file can be stale or hand-edited; a station must never throw because of it. |
| D5 | **One `<audio>` element per Listen control, reused for every clip of its queue; and one voice at a time across the page** (a module-level pointer to the active control's stop function). | iOS Safari only allows a later `play()` without a tap on an element that a tap already started; swapping `src` on one element keeps the unlock. Two controls (a station's and the Walk bar's) must not talk over each other. |
| D6 | **State is visible without any CSS and carried by ARIA once.** The button's accessible name never changes (`Listen`); `aria-pressed` carries on/off; a hidden-when-empty `span.listen-mark` shows `…` (loading), `■` (playing), `!` (error) to sighted users; `data-state` is the hook for CSS and tests. | A name that flips to "Stop" while `aria-pressed` is true is read twice by screen readers; and the pressed look must not depend on a file another goal owns. |
| D7 | **A live transcript line is shown while a whole-station narration plays** (`p.listen-caption`: "2 of 6 · the sentence being said"), created lazily on first play. In single-segment mode (`segment` given, as the Walk bar does) no transcript is created, because the host already prints that sentence; an **error line** is shown in both modes. | Audio-only content needs a text equivalent, and the position ("2 of 6") is the only progress cue. Lazy creation keeps the static DOM exactly ARCHITECTURE 9 (button plus audio). |
| D8 | `Listen` dispatches two bubbling `CustomEvent`s on its button: `listen:play` and `listen:stop` (section 4.3). | Lets the Walk or a test react to the clip lifecycle without polling, and lets the interaction script assert behaviour without sampling audio. |
| D9 | `walk.json` is **generated from the registry** by one command (section 5.8), not typed. The unit test compares it with `STATIONS[i].walk.say` and fails until it is regenerated. | A2 pins `texts equal STATIONS[i].walk.say exactly`; typing 22 sentences invites drift. |
| D10 | `palette.py` also gets two small pure helpers, `mix` and `ramp`, that reproduce the site's time ramp (`plane.js` `mixColor`, `rampMix`, weight 0.4). They define no `NAME = "#hex"` line, so A1's parse is unaffected. A unit test runs them under `python3` when it is installed and skips otherwise. | STORY section 4 says the time ramp is the same in the videos; both video goals say "the time ramp from T0 to T1". Providing it once is cheaper than three variants. |
| D11 | The five station narration files obey an **ear-first rule beyond A2**: no digit and none of `= ^ _ { } < > + * /` (numbers, signs and operators are spelled out, "u sub x equals v sub y"). `walk.json` is exempt because its text is pinned to the registry. | The scripts are read by a speech model; a spoken "u_x = v_y" is a coin toss. |

### 0.2 Discrepancies in the goal text, and how this design resolves them

| # | Discrepancy | Resolution (binding for the builder and both reviews) |
|---|---|---|
| S1 | A2 says "every file's texts, joined, contain both 'Cartesian' and 'polar'", but it also says `walk.json` texts equal the registry's `walk.say` exactly, and no `walk.say` contains either word (checked: the 22 sentences have 200 words in all and neither word appears). Both cannot hold for `walk.json`. | The both-addresses rule applies to the **five station files** (`home`, `staircase`, `roots`, `derivative`, `lab`). `walk.json` is held to the other A2 rules (22 segments, ids, texts equal, no `$` or backslash). If the planner wants the Walk to say both words, the change belongs in `js/registry.js` (`walk.say`), after which `walk.json` is regenerated. |
| S2 | A4 says `videoPanel(host, 'staircase-roots')` with the **real** manifest "resolves null and host has no children". That is true only while the manifest is empty. After the video goals render the video and the local agent runs the audio, the real manifest will list `staircase-roots`. | The script derives the expectation from the real manifest: `expectNull = videoFor(real, 'staircase-roots') === null`, and asserts `(result === null) === expectNull` (and the host is empty exactly when null). The same for `listenControl(host, 'staircase')` with `clipsFor(real, 'staircase')` filtered for valid clips. The explicit-manifest cases of A4 stay literal. |
| S3 | A4 says the script "exports `expectedErrors` for the two fake media URLs". Chromium reports a failed media fetch as up to three kinds of harness line: `HTTP 404: <url>`, a URL-less `console.error: Failed to load resource: the server responded with a status of 404 (Not Found)`, and (when a load is aborted by removal) `request failed: <url>`. In the reference run only the first two appeared: per view, two `HTTP 404` lines for the `.mp4`, two for the `.vtt` (the script builds two panels) and four console lines, 8 in all; the third pattern is insurance. | Section 7 gives the three patterns, scoped to the fake file names. A 404 for any other file still fails the run. Do not pin the count of ignored lines. |
| S4 | ARCHITECTURE 1 says `listen.js` puts its rules in `css/components.css`, but that file is owned by `i2-walk-shell` (wave 1, concurrent). | The module is correct without that CSS (D2). The CSS is a recommended block in section 9, passed to the owner; losing it costs polish, not behaviour. |

### 0.3 Differences between ARCHITECTURE and the code on disk (the code wins)

- `media/manifest.js` is generated by `tools/videos/render.mjs` `writeManifest`. Once narration JSON exists, `writeManifest` lists **every** narration file as a `SITE_AUDIO` key, with `clips` holding only the clips whose mp3 exists (so a key with `clips: []` is normal until the audio run). `clipsFor` therefore returns `[]` for a present station, and `listenControl` resolves `null`. The builder must not run the writer or edit the manifest (not owned); the committed manifest stays empty until the local agent's run.
- `tools/media/generate-audio.mjs` reads `{ title, voice?, music?, segments }` and writes `media/audio/<group>/<id>/<segment>.mp3`; site narration has no `music`. The extra top-level `id` field in our files is ignored by it. `walk.json` therefore produces `media/audio/site/walk/<station id>.mp3`, the path the manifest and the Walk bar expect.
- `videos/lib/narrated.py` imports nothing from `palette.py`; the palette is consumed only by scenes (written by the video goals). No name is renamed: the eight old names (`BG`, `INK`, `MUTED`, `CART`, `POLAR`, `INPUT`, `OUTPUT`, `WARN`) keep their names and take the dark token values; five names are new (`SURFACE`, `SEAM`, `T0`, `T1`, `OK`). No scene exists yet (`videos/scenes/` holds only a stale `__pycache__`), so nothing breaks.
- `tools/smoke.mjs`'s static server has no MIME entries for `.mp4`, `.vtt`, `.mp3` or `.wav` and no `Range` support. It does not matter for A4 (the files are fake) but it matters to anyone who later wants to play a real clip through the harness (section 8, E19).

---

## 1. Goal restatement, story thread, problems and topics covered

**Goal.** Give every station a safe, optional way to show a video and to speak, and give the videos the site's colours. Concretely:
(a) `listen.js` resolves the generated manifest without ever failing a page, builds a **video panel** only when the manifest has that
video, and a **Listen control** only when narration clips exist; (b) `palette.py` becomes the dark theme's tokens under the fixed
mapping of ARCHITECTURE 11.4, so a video wears the same two-address colours as the site (today CART is teal where the site's is blue,
and INPUT is blue where the site's is green); (c) six narration scripts exist, written for the ear, ready for the student's audio run.

**Story thread carried.** *The spine said aloud.* STORY section 0 is four lines and two decisions; this goal is the part of the site
that says them. The Walk's 22 sentences (one per stop) and the narration of the five busiest stations are the four lines spoken in
the order the student walks them, and every spoken example names both addresses out loud, so the ear hears "same dot, two
addresses" the way the eye sees it.

**How it shows on screen.**
- A small `Listen` button beside each narrated station's header (`home`, `staircase`, `roots`, `derivative`, `lab`) and inside the
  Walk bar next to the sentence to say. It appears only when the clip files exist; before the audio run nothing changes anywhere.
- A `Watch (2–3 min)` panel directly after a station's first picture, only when the video file exists.
- In the videos: the Cartesian pieces are blue (`CART`), the polar pieces orange (`POLAR`), the input stroke green (`INPUT`), its
  image pink (`OUTPUT`), time runs from `T0` to `T1`, the seam is `SEAM`: the same marks as the site (STORY section 4).
- In this goal nothing visible changes yet (A5): no station imports `listen.js` until wave 1.

**Review problems and topics covered.** The scripts speak, and the unit tests pin, the worked numbers of 1.3.1, 1.4.1, 1.4.2,
2.2.2, 2.4.1, 3.1.1, 3.1.2 and 3.2.1 (the goal's `assignment_refs`), and, because the narration also quotes them, 1.4.3 (the
quadratic as a square root in disguise), 2.1.2 (`x = 2` under `z²`, "focus at zero") and P6 (`Re z` and `conj z` as circles of
directional quotients). Topics T1.3 (polar representation), T1.4 (powers and roots), T2.4 (branches) and T3.1 (derivatives).
Section 6 gives each in **both** the Cartesian and the polar address.

---

## 2. UX

Two small pieces and one palette. Neither piece is a page of its own: they sit inside stations and the Walk bar, which choose the
host element.

### 2.1 Where the pieces sit

| Piece | Host (chosen by the consumer) | Id of the thing this module builds |
|---|---|---|
| Listen control on a station | a small `div` right after the header's lede | `button#<station>-listen`, `audio#<station>-listen-audio` |
| Listen control in the Walk bar | `#walk-listen` | `button#walk-listen-btn`, `audio#walk-listen-btn-audio` (the Walk passes `id: 'walk-listen-btn'` and `segment: <station id>`) |
| Video panel | a `div` the station puts **after its first picture** (the first `.plane` or `.three-view` host), never before | `section#video-<video id>` |

### 2.2 Wireframes

**A. Station header with the Listen control (desktop, 1280 px).** Idle, then playing:

```
 The Staircase: z, arg z, Arg z                                           T2 · The staircase
 Drag z once round the origin: the point moves smoothly, Arg z jumps at the seam.

 [ Listen ]                                          button#staircase-listen  aria-pressed="false"

 ------------------------------------ while a clip plays -------------------------------------
 [ Listen ■ ]                                        aria-pressed="true"  data-state="playing"
 3 of 6 · Capital Arg z is the one step we call home: the angle greater than minus pi, up to
 and including pi. The shaded window on the list shows it. ...     p#staircase-listen-caption
```

**B. Video panel (desktop).** It sits under the first picture; the video is 16:9 at the panel's inner width:

```
 +==============================================================================================+
 | (4 px top border in --accent)                                                                |
 |  Watch (2–3 min): The staircase, and why roots need all of it   h2#video-staircase-roots-title|
 |  One dot, many names for its angle, and what each problem does with them.                    |
 |  150 s · Silent, with captions                       p.muted#video-staircase-roots-summary   |
 |  +----------------------------------------------------------------------------------------+  |
 |  |                                                                                        |  |
 |  |                              <video> 16 : 9                                            |  |
 |  |                                                                                        |  |
 |  |  [play]  0:00 / 2:30  ----o----------------------------   [volume]  [CC]  [full]       |  |
 |  +----------------------------------------------------------------------------------------+  |
 +==============================================================================================+
```

**C. Phone (390 px).** 16 px page gutters, panel padding 1 rem, so the video is about 324 × 182 px:

```
 +----------------------------------------+
 | The Staircase: z, arg z, Arg z         |
 | Drag z once round the origin ...       |
 | [ Listen ]                             |   >= 44 px tall (var(--tap))
 | 3 of 6 · Capital Arg z is the one      |   only while playing; wraps
 | step we call home: the angle ...       |
 | ...                                    |
 | (first picture, full width)            |
 +========================================+
 | Watch (2–3 min): The staircase, and    |
 | why roots need all of it               |
 | One dot, many names ... 150 s · Silent,|
 | with captions                          |
 | +------------------------------------+ |
 | |        <video> 16:9  324 x 182     | |
 | | [>] 0:00 / 2:30 ----o----- [CC] [ ]| |
 | +------------------------------------+ |
 +========================================+
```

**D. Error states.** The video file fails to load (the player is hidden, the page keeps working); a clip fails to load:

```
 | Watch (2–3 min): The staircase, and why roots need all of it
 | One dot, many names ... · 150 s · Silent, with captions
 | The video did not load. Everything else on this page works without it.   p#video-...-error role="alert"

 [ Listen ! ]                                       data-state="error"  aria-pressed="false"
 The audio did not load. Press Listen to try again, or read the page instead.      p#staircase-listen-error role="alert"
```

**E. Walk bar fragment (owned by `i2-walk-shell`; shown only so the consumer contract is clear).** Single-segment mode, so no transcript:

```
 | Stop 5 of 22 · The Staircase: z, arg z, Arg z                               [Back]  [Next] |
 | Do:  Drag z once round the origin and watch Arg z jump at the seam ...                      |
 | Say: "arg z is every name; Arg z is the home step; z never moves."          [ Listen ]      |
```

**Empty states.** There is none to draw: a panel or control with nothing to show is **absent** (no element at all, nothing reserved).
That is the contract in CONSTRAINTS ("Stations must hide the control when the clips are absent").

### 2.3 Controls and elements

The ids follow ARCHITECTURE 9 ("Video panel", "Listen control"); `<key>` is the video id with every character outside `[A-Za-z0-9_-]`
replaced by `-`; `<id>` is the Listen id (`<station>-listen` unless the caller gives one; the caller's id is used as given).

| Element | id | Label / text | Behaviour |
|---|---|---|---|
| Video panel | `video-<key>` | none (labelled by its heading) | `section.panel.video-panel`, attributes `data-video` (the video id), `data-tone="accent"`, `data-narrated="true\|false"`, `data-state="loading\|ready\|error"`, `aria-labelledby="video-<key>-title"`. Idempotent: a second call for the same id on the same container returns the element already there. |
| Heading | `video-<key>-title` | `Watch (2–3 min): <video title>` (the lead text is the `title` option) | `h2.panel-title`. |
| Summary | `video-<key>-summary` | `<summary> · <seconds> s · <voice part>` | `p.muted`. Parts left out when empty or zero. Voice part: `With voice and captions`, `With voice`, `Silent, with captions`, `Silent`. |
| Player | `video-<key>-player` | none (described by the summary) | `<video controls playsinline preload="metadata">` with `<source>` and, when the manifest has captions, `<track kind="captions" srclang="en" label="English" default>`. Never `autoplay`, never `loop`. Native controls and keyboard. Hidden (`display: none`) while the file has failed. |
| Video error | `video-<key>-error` | `The video did not load. Everything else on this page works without it.` | `p.muted.video-error`, `role="alert"`, `hidden` until the `<source>` (or the video) fires `error`; hidden again on `loadedmetadata`. |
| Listen button | `<id>` | `Listen` (always) | `button.btn.btn-quiet.listen`, `type="button"`, `aria-pressed`, `data-state="idle\|loading\|playing\|error"`, `data-station`, `data-clip` (index of the current clip while active). Click or tap toggles: idle or error starts the whole queue (or the one segment), loading or playing stops it. |
| Listen mark | none | `…` loading, `■` playing, `!` error, nothing (and `hidden`) when idle | `span.listen-mark[aria-hidden="true"]` inside the button, so `button.textContent === 'Listen'` while idle. |
| Audio | `<id>-audio` | none | `<audio preload="none">` with no `controls` (so it is not rendered and is not in the accessibility tree), no `src` until a clip starts. |
| Transcript | `<id>-caption` | `<n> of <count> · <clip text>` (just the text when there is one clip) | `p.listen-caption.muted`, created on first play of a whole-station queue, `hidden` and emptied when idle. Not a live region. |
| Listen error | `<id>-error` | `The audio did not load. Press Listen to try again, or read the page instead.` or, when the browser refused to start the sound (`NotAllowedError`), `Your browser would not start the sound. Press Listen again.` | `p.listen-error`, `role="alert"`, created at the moment of failure, removed on the next play, stop or destroy. |

### 2.4 Interaction

- **Pointer and touch.** One `click` listener on the Listen button (a tap is a click). No hover-only information, no long press, no
  gesture. The button's height is `var(--tap)` (2.75 rem, 44 px) from `.btn`. The video uses the browser's native controls.
- **Keyboard.** Tab reaches the Listen button and then the video; Space and Enter on the button toggle (native `button`); the focus
  ring is the global `:focus-visible` rule (3 px `--focus`). No key handler of our own, and Escape is deliberately not bound (other
  widgets own it). Video keys are the browser's.
- **Screen reader.** The button reads "Listen, toggle button, not pressed / pressed". The video panel is a labelled section; its
  heading is an `h2`. Errors are `role="alert"` and are announced once, when they appear. The transcript is deliberately not a live
  region: a screen-reader user who presses Listen would otherwise hear the voice and the reader at once.
- **Order of events when a whole-station narration runs.** click, `loading` (mark `…`, transcript "1 of 6 · ..."), the browser's
  `play()` resolves, `playing` (mark `■`, `listen:play`), the clip ends, the next clip starts at once (no gap, no tap), and so on;
  after the last clip: `idle`, transcript hidden, `listen:stop` with reason `ended`.
- **Loading.** Nothing is fetched until the first click (`preload="none"`; no `src` yet). The video fetches only its metadata
  (`preload="metadata"`). The manifest is one small module loaded once per page.
- **Errors.** Section 2.3 rows "Video error" and "Listen error". An error never blocks the page, never uses `alert()`, and the
  Listen button stays usable (a press retries).

### 2.5 Copy (every string this module writes)

| Where | Text |
|---|---|
| Listen button | `Listen` |
| Video heading, lead text (default of the `title` option) | `Watch (2–3 min)` (an en dash, U+2013) |
| Video heading | `Watch (2–3 min): <video title>`; if the video has no title, just the lead text |
| Summary parts | `<summary>`, `<n> s`, `With voice and captions`, `With voice`, `Silent, with captions`, `Silent`, joined by ` · ` (space, U+00B7, space) |
| Video fallback inside `<video>` | `Your browser cannot play this video.` |
| Video error | `The video did not load. Everything else on this page works without it.` |
| Transcript | `<n> of <count> · <text>` |
| Listen error | `The audio did not load. Press Listen to try again, or read the page instead.` |
| Listen error (sound refused) | `Your browser would not start the sound. Press Listen again.` |
| Mark glyphs | `…` (U+2026), `■` (U+25A0), `!` |
| Console (never `error`) | `[mv] media/manifest.js could not be loaded: <message>. Videos and narration stay off.` and `[mv] media/manifest.js: ignored <n> malformed entry.` / `entries.` |

### 2.6 What the student hears: the narration scripts

Voice and register: a calm teacher the night before the test. Short sentences, one idea per segment, numbers and operators spelled
out, and **both addresses said aloud** wherever a number appears ("In Cartesian it sits one step left and root three steps up. In
polar it is the move that turns one by a hundred and twenty degrees and stretches it to length two."). Capital `Arg z` and little
`arg z` are both written exactly so (the acceptance test looks for both), and the words around them carry the difference ("Little arg
z is every name. Capital Arg z is the one home name."), because a speech model says both the same way.

Segment ids are lowercase words with hyphens. Word counts (whitespace-split / letters-only, both within 8 to 70; limits are checked
under both counters so a hyphenated "seventy-two" cannot push a segment over): the totals are home 309 words (about 124 s at the
recipe's 2.5 words per second), staircase 293 (117 s), roots 318 (127 s), derivative 293 (117 s), lab 221 (88 s), walk 200 (80 s):
**51 clips, about 11 minutes of audio, 8,476 characters** for the audio run (1,634 words).

`media/narration/site/home.json` (6 segments):

```json
{
  "id": "home",
  "title": "The Map: four lines and two decisions",
  "segments": [
    { "id": "move", "text": "A complex number is a move: turn, then stretch. Take minus one plus i root three. In Cartesian it sits one step left and root three steps up. In polar it is the move that turns the number one by a hundred and twenty degrees and stretches it to length two. Same dot, two addresses." },
    { "id": "names", "text": "A turn has many names. Turning by a hundred and twenty degrees and turning by four hundred and eighty land on the same dot. Little arg z is every name. Capital Arg z is the one home name. Roots need all the names, principal values use the home name, and a branch picks one name without jumping." },
    { "id": "motion", "text": "A function moves every point at once. Draw a stroke and its image moves along with it, on the same clock. Squaring doubles every angle. One over z turns the plane inside out. Both are built from moves, done at every point." },
    { "id": "zoom", "text": "Differentiable means: up close, one move. Zoom in on a point. If the picture there is only turned and stretched, with no mirror, the function has a derivative. That derivative is a complex number, so it has a Cartesian address and a polar address, like every other number." },
    { "id": "decisions", "text": "Every problem on the test comes down to two decisions. First, the address: is this a slide question in Cartesian, or a move question in polar? Second, the names: do you need no angle, any name, all the names, the home name, or a continuous choice? Make those two choices and you know where to go." },
    { "id": "walk", "text": "If you have an hour, press the Walk. It takes you through all twenty-two places in order, with one thing to do and one sentence to say at each. If you only have ten minutes, drag the dot once round the origin, then open the Rehearsal Room and try three cards." }
  ]
}
```

`media/narration/site/staircase.json` (6 segments):

```json
{
  "id": "staircase",
  "title": "The Staircase: what to drag, what jumps, why",
  "segments": [
    { "id": "dot", "text": "Drag z once all the way round the origin. The dot moves smoothly. In Cartesian it is just an x and a y changing a little at a time. In polar, the angle turns through a full circle." },
    { "id": "names", "text": "The dot has one Cartesian address, but many polar ones. A hundred and twenty degrees, four hundred and eighty, and minus two hundred and forty all land on the same dot. The list of all of them is arg z: a staircase with one step for every full turn." },
    { "id": "home", "text": "Capital Arg z is the one step we call home: the angle greater than minus pi, up to and including pi. The shaded window on the list shows it. The dot does not move when you change steps. Only the name changes." },
    { "id": "jump", "text": "Now drag the dot across the negative real axis. The dot crosses smoothly, but the home step jumps between pi and minus pi. Going once round the origin, a continuous angle has to climb a whole step, and the home window is only one step tall. So the home name must jump somewhere. That place is the seam." },
    { "id": "use", "text": "This is why the test keeps asking which names you need. Powers work with any name. Roots need all of them. Principal values use the home name. A branch is a continuous choice, with the seam moved out of the way." },
    { "id": "branch", "text": "For a cube root that is continuous along the negative real axis, put the seam on the positive real axis, so angles run from zero to two pi. Then minus one has angle pi, and its cube root has angle pi over three. In polar, that is length one at sixty degrees. In Cartesian, it is one half plus root three over two, times i." }
  ]
}
```

`media/narration/site/roots.json` (6 segments):

```json
{
  "id": "roots",
  "title": "Roots: divide the staircase",
  "segments": [
    { "id": "divide", "text": "To take an n-th root, divide the staircase. The angle of c has a name for every full turn. Divide each of those names by n and you get n different polar addresses. Take the length to the power one over n, and those are your roots." },
    { "id": "five", "text": "Try the fifth roots of one. The names of its angle are zero, three hundred and sixty, seven hundred and twenty degrees, and so on. Divide by five: zero, seventy-two, a hundred and forty-four, and on up. Five dots, seventy-two degrees apart, all on the unit circle. Step five gives three hundred and sixty degrees, which is step zero again." },
    { "id": "minus-sixteen", "text": "Now the fourth roots of minus sixteen. It has length sixteen and home angle a hundred and eighty degrees. The fourth root of sixteen is two. The angles are forty-five, a hundred and thirty-five, two hundred and twenty-five and three hundred and fifteen degrees. In Cartesian, each root is plus or minus root two, plus or minus root two times i." },
    { "id": "check", "text": "Check one in polar. Length two, to the fourth power, is sixteen. Angle forty-five degrees, times four, is a hundred and eighty degrees. Length sixteen at a hundred and eighty degrees is minus sixteen. It works, and so do the other three." },
    { "id": "quadratic", "text": "The quadratic formula is a square root in disguise. For z squared minus four z plus thirteen, complete the square: z minus two, squared, equals minus nine. The square roots of minus nine are plus and minus three i. Slide by two, and the roots are two plus three i and two minus three i." },
    { "id": "principal", "text": "The principal root is the one on the home step. Two i has length two and home angle ninety degrees. So its principal square root has length root two and angle forty-five degrees. In Cartesian, that is one plus i. The other root, minus one minus i, comes from the next step up." }
  ]
}
```

`media/narration/site/derivative.json` (6 segments):

```json
{
  "id": "derivative",
  "title": "The Derivative: the ring, the circle, the point",
  "segments": [
    { "id": "ring", "text": "Put a point under a microscope. Around it is a tiny ring of directions. Watch where the function sends that ring. If it comes out as a ring that is only turned and stretched, by one number, then up close the function is one move." },
    { "id": "number", "text": "That number is the derivative, and it is a complex number. So it has two addresses, like any other. In Cartesian it is u sub x plus i times v sub x. In polar, its length is the local stretch and its angle is the local turn." },
    { "id": "circle", "text": "Here is the test. Take the quotient from every direction. Each direction gives a dot, and the dots trace a circle. Its centre is the move part, A. Its radius is the size of the mirror part, B. The derivative exists exactly when the circle is one point." },
    { "id": "mirror", "text": "Conjugation is pure mirror, so its circle never shrinks. The real part squashes the plane, and its circle has radius one half. But z squared plus z has no mirror at all. Its circle is a point, and the derivative is two z plus one." },
    { "id": "abs2", "text": "Now try the absolute value of z, squared. Its circle has radius equal to the length of z, centred on the mirror image of z. It shrinks to a point only at zero. So it is differentiable at zero, and nowhere else." },
    { "id": "exp", "text": "In x and y, no mirror part reads: u sub x equals v sub y, and u sub y equals minus v sub x. That is Cauchy-Riemann. Test e to the x, times the quantity cos y plus i sin y. Both hold everywhere, so it is entire, and its derivative is itself. In polar, it stretches by e to the x and turns by y." }
  ]
}
```

`media/narration/site/lab.json` (5 segments):

```json
{
  "id": "lab",
  "title": "The Mapping Lab: draw, watch, replay, predict",
  "segments": [
    { "id": "draw", "text": "This is your diary page. Draw anything on the left plane: a line, a rectangle, a circle, a squiggle. The right plane answers while your hand is still moving. The left plane is z, the input. The right plane is w, the output." },
    { "id": "clock", "text": "Your stroke carries a clock. It is dark where you started and light where you finished. The image keeps the same clock, so you can see which part of the stroke lands where. Press Replay to watch both being drawn again from the start." },
    { "id": "views", "text": "Change the view and you look at the same function from another side. Side by side, a morph, domain colouring, a landscape of the modulus, the Riemann sphere, and a four dimensional shadow. Every view is a shadow of one object." },
    { "id": "addresses", "text": "Try the grid patches to see why the address matters. A Cartesian grid, with lines for x and y, bends under squaring. A polar grid, with circles and rays, stays a polar grid. Functions built from moves keep circles and rays." },
    { "id": "predict", "text": "Before you press Reveal, predict. Load the line x equals two under z squared, and sketch where you think the image goes. Then reveal. It is a parabola opening to the left, with its focus at zero. If you got it right, you did not memorise it. You pushed the line forward." }
  ]
}
```

`media/narration/site/walk.json` (22 segments; generated, see 5.8; shown as it is at design time, the registry is the authority; the generator writes one compact `{"id":…,"text":…}` per line, which is the same JSON):

```json
{
  "id": "walk",
  "title": "The Walk: one sentence per stop",
  "segments": [
    { "id": "home", "text": "A complex number is a move: turn, then stretch." },
    { "id": "addresses", "text": "Same dot, two addresses." },
    { "id": "arithmetic", "text": "Multiplying is a move; adding is a slide." },
    { "id": "distance", "text": "A circle is every point one stretch away from the centre." },
    { "id": "staircase", "text": "arg z is every name; Arg z is the home step; z never moves." },
    { "id": "powers", "text": "Any name works for a power; report the home step." },
    { "id": "roots", "text": "Roots need every name; k = n is k = 0 again." },
    { "id": "curves", "text": "A curve is a point that moves; time is the clock the w-plane will keep." },
    { "id": "sets", "text": "Open, closed, boundary: all sentences about a tiny disk." },
    { "id": "mappings", "text": "Functions built from moves keep circles and rays." },
    { "id": "linear", "text": "One move and one slide, for the whole plane." },
    { "id": "powermap", "text": "Push the line forward with y as the clock, then eliminate y." },
    { "id": "principal-root", "text": "Principal means the home step only." },
    { "id": "branches", "text": "A branch is a continuous choice of name; cut where the question does not look." },
    { "id": "reciprocal", "text": "Invert the length, mirror the angle; zero goes to infinity, so the circle opens." },
    { "id": "limits", "text": "Every direction must agree." },
    { "id": "derivative", "text": "Differentiable means one move up close; the derivative is that move." },
    { "id": "cauchy-riemann", "text": "Cauchy-Riemann says no mirror." },
    { "id": "lab", "text": "Draw it, push it forward, read it." },
    { "id": "graph4d", "text": "Every picture is a shadow of one object." },
    { "id": "rehearse", "text": "Same place, new numbers." },
    { "id": "problems", "text": "Which place, which address, which names." }
  ]
}
```

Per-segment word counts (whitespace / letters-only): home move 55/55, names 57/57, motion 42/42, zoom 48/48, decisions 56/56, walk
51/52; staircase dot 38/38, names 49/49, home 42/42, jump 58/58, use 41/41, branch 65/65; roots divide 47/48, five 60/63, minus-sixteen
61/64, check 42/43, quadratic 55/55, principal 53/54; derivative ring 45/45, number 47/47, circle 48/48, mirror 45/45, abs2 42/42, exp
66/67; lab draw 43/43, clock 44/44, views 41/41, addresses 41/41, predict 52/52. Pronunciation note for the audio run (not a build
concern): "arg", "Cauchy-Riemann" and "z" are the words a speech model may misread; the local agent should listen to three clips
(`staircase/names`, `derivative/exp`, `roots/five`) and, if one is wrong, change the **text** (not the voice); a text change is
picked up by the clip hash.

---

## 3. Visual encoding

There is no canvas in this goal. The visual encoding is (a) the two small DOM pieces, drawn only from `css/theme.css` tokens so
both themes work, and (b) the video palette.

### 3.1 The DOM pieces, per theme

All colour comes from tokens; the module writes no colour literal (the only inline style is on the video: width, aspect ratio, a
token background).

| Part | Token | Light | Dark | Notes |
|---|---|---|---|---|
| Panel surface | `--surface` (via `.panel`) | `#ffffff` | `#151c2b` | border `--border`, shadow `--shadow` |
| Panel top rule | `--accent` (via `data-tone="accent"`) | `#2f3e5c` | `#cfd8ea` | 4 px; contrast with the surface 10.69 : 1 light, 11.89 : 1 dark |
| Heading and summary text | `--text` / `--text-muted` | `#1a2230` / `#515b6c` | `#e9edf5` / `#a6b0c3` | text on surface 15.96 : 1 and muted 6.86 : 1 (light), 14.52 : 1 and 7.80 : 1 (dark), all above 4.5 : 1 |
| Video box (before it loads, and its border) | `--surface-2`, `--border` | `#ece8de` | `#1e2739` | the picture itself is the render's own dark frame in both themes (the videos are made once, on the dark palette) |
| Error text | `--text-muted` in the video panel; `--danger` recommended for the Listen error (section 9) | `#b3261e` | `#ff8178` | danger on surface 6.54 : 1 light, 7.03 : 1 dark; meaning is also in words and in the `!` mark, never colour alone |
| Listen button | `.btn`, `.btn-quiet` | `--border-strong` on hover | `--border-strong` on hover | pressed look recommended in section 9 (`--accent` border and a 16 % tint); without it the `■` mark carries the state |
| Focus ring | `--focus` (global) | `#1a2230` | `#e9edf5` | 3 px, from the global `:focus-visible` rule |

### 3.2 The video palette (`videos/lib/palette.py` = the dark tokens)

The mapping is fixed by ARCHITECTURE 11.4 and tested by A1. Values are the `:root[data-theme="dark"]` block of `css/theme.css`
(identical to the `prefers-color-scheme: dark` block; test U1 checks both).

| Python name | Token | Value (new) | Was | Use in a scene |
|---|---|---|---|---|
| `BG` | `--bg` | `#0d121c` | `#0f1626` | background |
| `SURFACE` | `--surface` | `#151c2b` | new | panels, cards, label backing |
| `INK` | `--text` | `#e9edf5` | `#e8ecf4` | main text and the point z |
| `MUTED` | `--text-muted` | `#a6b0c3` | `#8b96ab` | secondary text, faint grid |
| `CART` | `--cart` | `#62adf2` | `#3fc1b0` (teal) | everything Cartesian: x, y, Re, Im, drop lines, the slide of addition, grid lines |
| `POLAR` | `--polar` | `#ff9d5c` | `#f0a64a` | everything polar: r, theta, arg, the ray, the arc, circles, rays, the spin-and-stretch |
| `INPUT` | `--input` | `#3fd0a0` | `#7aa7ff` (blue) | the z-plane stroke |
| `OUTPUT` | `--output` | `#e48fd2` | `#ff7ab8` | the w-plane image |
| `SEAM` | `--seam` | `#8e99b0` | new | the negative real axis / the cut, dashed |
| `T0` | `--t0` | `#5c7498` | new | start of the time ramp |
| `T1` | `--t1` | `#f3f6fb` | new | end of the time ramp |
| `WARN` | `--danger` | `#ff8178` | `#ff6b6b` | cuts, failures, discontinuities |
| `OK` | `--ok` | `#63d08a` | new | agreement checks |

The videos use only the dark palette. In the site's light theme the video sits in its dark frame inside a light panel; that is
deliberate (one render, readable on both) and the panel chrome around it follows the theme.

---

## 4. Module API

### 4.1 `js/core/listen.js` (no static import; the only load is a dynamic `import('../../media/manifest.js')`)

Exactly these exports; the parameter lists are copied from ARCHITECTURE 11.4 and must match character for character.

```js
export function loadManifest()                              // → Promise<Manifest>; one dynamic import, cached (the same promise every call); a failure resolves to { VIDEOS: [], SITE_AUDIO: {} } after one console.warn (never console.error)
export function videoFor(manifest, id)                      // pure → Video | null
export function clipsFor(manifest, station)                 // pure → [{ id, text, src }] ([] when none)
export function videoPanel(container, videoId, { title = 'Watch (2–3 min)', manifest = null } = {})   // → Promise<HTMLElement | null>
export function listenControl(container, station, { id = `${station}-listen`, segment = null, label = 'Listen', manifest = null } = {})   // → Promise<Listen | null>
export function resetManifestCache()                        // tests only: forgets the cached promise
```

Nothing runs at import: no DOM access, no timer, no listener, no fetch (the module imports in Node). The file must not contain the
string `data-for`, the text `console.error`, `innerHTML`, `alert(`, `window.open` or an `iframe`.

### 4.2 Data structures

```
Manifest = { VIDEOS: Video[], SITE_AUDIO: { [station: string]: { title: string, clips: Clip[] } } }
Video    = { id, title, summary, station: string | null, src, captions: string | null, seconds: number, narrated: boolean, music: boolean }
Clip     = { id: string, text: string, src: string }
Listen   = { el: HTMLButtonElement, audio: HTMLAudioElement, clips: readonly Clip[],
             play(segmentId = null): Promise<boolean>,   // the one segment, or every clip in order; true when playback started; never rejects
             stop(): void,                               // idle again; a no-op when idle; clears an error state
             destroy(): void,                            // stops, removes the button, the audio and any line this control added; safe to call twice
             readonly playing: boolean }                 // true while loading or playing
```

`loadManifest` returns the **normalised** manifest (rules in 5.2); `videoFor` and `clipsFor` read any manifest-shaped object,
tolerate garbage (`null`, wrong types) and never mutate. `clipsFor` returns a new array (a shallow copy) each call. All paths in a
manifest are relative to `index.html` (`media/video/<id>.mp4|.vtt`, `media/audio/site/<station>/<segment>.mp3`).

### 4.3 Events

Dispatched on the Listen button, `bubbles: true`, as `CustomEvent`s:

| Event | `detail` | When |
|---|---|---|
| `listen:play` | `{ station, segment: <clip id>, index, count }` | each time a clip begins to play (the browser's `play()` promise resolved) |
| `listen:stop` | `{ station, reason, index }`, `reason` in `'ended'`, `'stopped'`, `'preempted'`, `'error'`, `'destroyed'` | when an active narration ends: after the last clip, `stop()` or a second click, another Listen started, a load or play failure, `destroy()`. Not fired when the control was idle. |

The DOM mutations (`aria-pressed`, `data-state`, the mark) happen **before** the event is dispatched.

### 4.4 Lifecycle and the consumer patterns

`videoPanel` is stateless: it attaches listeners only to elements it creates, so the panel is removed with `panel.remove()` (a
removed `<video>` pauses itself). `listenControl` owns an audio element and a module-level "active" pointer, so its owner must call
`destroy()`.

Station pattern (stations and the Walk are built by other goals; this is the contract they build against):

```
mount(el, ctx):
  alive = true; panel = null; listen = null
  videoPanel(slotAfterFirstPicture, 'staircase-roots').then(p => { if (alive) panel = p; else if (p) p.remove() })
  listenControl(listenHost, 'staircase').then(l => { if (alive) listen = l; else if (l) l.destroy() })
  return function unmount() { alive = false; if (listen) listen.destroy(); if (panel) panel.remove() }
```

Walk bar pattern, on each stop change: `walkListen?.destroy(); walkListen = await listenControl(hostEl, 'walk', { id: 'walk-listen-btn', segment: stop.station })`;
hide `#walk-listen` when it resolves `null`. `js/app.js` may call `loadManifest()` once at start so the promise is already settled
when a station mounts (the panel then appears in the same frame; section 9).

`window.__mv`: this module adds no hook (all state is in `data-` attributes and the events above).

### 4.5 `videos/lib/palette.py`

Thirteen string constants (names and values in 3.2), then two helpers. Exact contract:

```python
BG = "#0d121c"        # --bg
# ... the other twelve exactly as in the table of section 3.2, one NAME = "#rrggbb" per line, lower-case hex, optional trailing comment

def mix(a: str, b: str, t: float) -> str: ...
def ramp(base: str, t: float, weight: float = 0.4) -> str: ...
```

`mix` is the sRGB channel-wise linear mix of two `#rrggbb` strings (either case), `t` clamped to 0..1 (a non-finite `t` counts as 0),
result lower-case `#rrggbb`; `ramp` is the site's time ramp. Formulas and expected values are in 6.2.

### 4.6 Narration file schema

`{ "id": "<file base name>", "title": "<non-empty>", "segments": [ { "id": "<a-z0-9-+>", "text": "<spoken text>" } ] }`, UTF-8, two-space
indent, a trailing newline, no `voice`, no `music`. Station files have 4 to 6 segments of 8 to 70 words; `walk.json` has 22 segments
whose ids are the station ids in registry order and whose texts are the registry's `walk.say`.

---

## 5. Algorithms

There is no rendering loop, no hit testing and no resolution management in this goal (no canvas, no animation). The timing that
exists is the clip chain in 5.5. Everything below is the order of operations the builder implements.

### 5.1 Module state and private helpers

```
state:   manifestPromise = null            // the cached promise
         stopActive = null                 // the stop function of the Listen that is playing (one voice at a time)
helpers: emptyManifest()      → { VIDEOS: [], SITE_AUDIO: {} }  (a fresh object each call; never share it)
         isRecord(x)          → x !== null && typeof x === 'object' && !Array.isArray(x)
         nonEmpty(x)          → typeof x === 'string' && x !== ''
         text(x, fallback)    → typeof x === 'string' ? x : fallback
         own(obj, key)        → isRecord(obj) && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined
         keyOf(s)             → String(s).replace(/[^A-Za-z0-9_-]/g, '-')
         assertElement(c)     → if (!c || c.nodeType !== 1 || !c.ownerDocument) throw new TypeError('listen.js: container must be an Element')
         mediaType(src)       → /\.mp4(?:[?#]|$)/i → 'video/mp4'; /\.webm(?:[?#]|$)/i → 'video/webm'; else ''
```

### 5.2 `loadManifest`, `readManifest`, `normalise`

```
loadManifest():
  1. if (manifestPromise === null) manifestPromise = readManifest()
  2. return manifestPromise                      // not async: the same promise object every call

async readManifest():                            // never rejects
  1. try {
  2.   const mod = await import('../../media/manifest.js')      // the literal specifier, in this one place
  3.   return normalise(mod)
  4. } catch (err) {
  5.   console.warn('[mv] media/manifest.js could not be loaded: ' + (err && err.message ? err.message : String(err)) + '. Videos and narration stay off.')
  6.   return emptyManifest()
  7. }

normalise(mod):                                  // never throws on shape problems; counts what it drops
  1. dropped = 0; out = emptyManifest()
  2. videos = mod ? mod.VIDEOS : undefined; if (videos !== undefined && !Array.isArray(videos)) dropped++
  3. for each v of (Array.isArray(videos) ? videos : []):
       if (!isRecord(v) || !nonEmpty(v.id) || !nonEmpty(v.src)) { dropped++; continue }
       if (out.VIDEOS.some(x => x.id === v.id)) { dropped++; continue }          // a duplicate id: the first wins
       out.VIDEOS.push({ id: v.id, title: nonEmpty(v.title) ? v.title : v.id, summary: text(v.summary, ''),
                         station: nonEmpty(v.station) ? v.station : null, src: v.src,
                         captions: nonEmpty(v.captions) ? v.captions : null,
                         seconds: Number.isFinite(v.seconds) && v.seconds > 0 ? Math.round(v.seconds) : 0,
                         narrated: v.narrated === true, music: v.music === true })
  4. site = mod ? mod.SITE_AUDIO : undefined; if (site !== undefined && !isRecord(site)) dropped++
  5. for each key of Object.keys(isRecord(site) ? site : {}):
       if (key === '__proto__') { dropped++; continue }
       entry = site[key]; if (!isRecord(entry)) { dropped++; continue }
       if (entry.clips !== undefined && !Array.isArray(entry.clips)) dropped++
       clips = []
       for each c of (Array.isArray(entry.clips) ? entry.clips : []):
         if (!isRecord(c) || !nonEmpty(c.id) || !nonEmpty(c.src)) { dropped++; continue }
         clips.push({ id: c.id, text: text(c.text, ''), src: c.src })
       out.SITE_AUDIO[key] = { title: nonEmpty(entry.title) ? entry.title : key, clips }
  6. if (dropped > 0) console.warn('[mv] media/manifest.js: ignored ' + dropped + (dropped === 1 ? ' malformed entry.' : ' malformed entries.'))
  7. return out
```

A key present with `clips: []` is normal (the writer emits it before the audio run) and counts as nothing dropped.
`resetManifestCache()`: `manifestPromise = null`.

### 5.3 `videoFor` and `clipsFor` (pure)

```
videoFor(manifest, id):
  1. list = own(manifest, 'VIDEOS'); if (!Array.isArray(list)) return null
  2. for v of list: if (isRecord(v) && v.id === id) return v              // first match; the same object, not a copy
  3. return null

clipsFor(manifest, station):
  1. entry = own(own(manifest, 'SITE_AUDIO'), station)                   // own(): 'constructor' and '__proto__' find nothing
  2. return isRecord(entry) && Array.isArray(entry.clips) ? entry.clips.slice() : []
```

### 5.4 `videoPanel(container, videoId, { title = 'Watch (2–3 min)', manifest = null } = {})`

```
async:
  1. assertElement(container)                                  // a bad container rejects with TypeError (a programmer error)
  2. if (!nonEmpty(videoId)) return null
  3. m = isRecord(manifest) ? manifest : await loadManifest()
  4. v = videoFor(m, videoId); if (!v || !nonEmpty(v.src)) return null    // nothing appended
  5. key = keyOf(videoId); panelId = 'video-' + key
  6. for child of container.children: if (child.id === panelId) return child          // idempotent
  7. doc = container.ownerDocument
  8. headline = [title, text(v.title, '')].filter(nonEmpty).join(': ')  || 'Video'
     voice    = v.narrated === true ? (nonEmpty(v.captions) ? 'With voice and captions' : 'With voice')
                                    : (nonEmpty(v.captions) ? 'Silent, with captions' : 'Silent')
     seconds  = Number.isFinite(v.seconds) && v.seconds > 0 ? Math.round(v.seconds) + ' s' : ''
     summary  = [text(v.summary, ''), seconds, voice].filter(nonEmpty).join(' · ')
  9. build (all text through textContent, all attributes through setAttribute; no innerHTML):
       section#panelId.panel.video-panel   data-video=videoId  data-tone=accent  data-narrated=String(v.narrated === true)
                                           data-state=loading  aria-labelledby=panelId+'-title'
         h2#panelId-title.panel-title             textContent = headline
         p#panelId-summary.muted                  textContent = summary
         video#panelId-player   controls, playsinline (attribute and property), preload="metadata", aria-describedby=panelId+'-summary'
              style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border-radius:var(--radius-sm);background:var(--surface-2)'
              source[src=v.src][type=mediaType(v.src) if non-empty]
              track[kind=captions][src=v.captions][srclang=en][label=English][default]       // only when nonEmpty(v.captions)
              a text node 'Your browser cannot play this video.'
         p#panelId-error.muted.video-error   role=alert   hidden   textContent = the video error sentence
 10. wiring (listeners on elements this call created, so nothing to remove):
       onFail  = () => { errorEl.hidden = false; video.style.display = 'none'; section.dataset.state = 'error' }
       onReady = () => { errorEl.hidden = true;  video.style.display = 'block'; section.dataset.state = 'ready' }
       source.addEventListener('error', onFail); video.addEventListener('error', onFail); video.addEventListener('loadedmetadata', onReady)
 11. container.appendChild(section); return section
```

The panel never sets `autoplay` or `loop`. `data-state` starts `loading` and changes only by the two listeners.

### 5.5 `listenControl(container, station, { id = `${station}-listen`, segment = null, label = 'Listen', manifest = null } = {})`

Setup:

```
async:
  1. assertElement(container); if (!nonEmpty(station)) return null
  2. m = isRecord(manifest) ? manifest : await loadManifest()
  3. usable = clipsFor(m, station).filter(c => isRecord(c) && nonEmpty(c.id) && nonEmpty(c.src))
                                  .map(c => Object.freeze({ id: c.id, text: text(c.text, ''), src: c.src }))
  4. clips = segment === null ? usable : usable.filter(c => c.id === segment)
  5. if (clips.length === 0) return null                       // nothing appended
  6. ctlId = nonEmpty(id) ? id : station + '-listen'; name = nonEmpty(label) ? label : 'Listen'; single = segment !== null
  7. doc = container.ownerDocument
     button = <button type=button id=ctlId class="btn btn-quiet listen" aria-pressed=false data-state=idle data-station=station>
                text node name, then span.listen-mark[aria-hidden=true][hidden]
              </button>
     audio  = <audio id=ctlId+'-audio' preload=none>              // setAttribute('preload', 'none'); no src, no controls
     container.append(button, audio)
  8. private state: state='idle', queue=[], index=0, run=0 (a token), destroyed=false, caption=null, errorEl=null
  9. attach: button 'click' → onClick;  audio 'ended' → onEnded;  audio 'error' → onAudioError;  audio 'pause' → onPause
 10. return listen = { el: button, audio, clips: Object.freeze(clips.slice()), play, stop, destroy, get playing() }
```

Private functions:

```
active()                → state === 'loading' || state === 'playing'

setState(next):
  state = next; button.dataset.state = next
  button.setAttribute('aria-pressed', active() ? 'true' : 'false')
  glyph = { idle: '', loading: '…', playing: '■', error: '!' }[next]; mark.textContent = glyph; mark.hidden = glyph === ''
  if (active()) button.dataset.clip = String(index) else delete button.dataset.clip

dispatch(type, detail): try { button.dispatchEvent(new CustomEvent(type, { bubbles: true, detail })) } catch (_) {}

showCaption(clip, i):  if (single) return
  caption ??= <p id=ctlId+'-caption' class="listen-caption muted"> inserted right after audio
  caption.textContent = queue.length > 1 ? (i + 1) + ' of ' + queue.length + ' · ' + clip.text : clip.text; caption.hidden = false
hideCaption():         if (caption) { caption.hidden = true; caption.textContent = '' }
clearError():          if (errorEl) { errorEl.remove(); errorEl = null }
showError(message):    clearError(); errorEl = <p id=ctlId+'-error' class="listen-error" role=alert>message</p> inserted right after audio

settle(next, reason):                                   // the one way out of an active state
  1. was = active(); at = index
  2. run += 1                                           // every pending play() promise is now stale
  3. try { audio.pause() } catch (_) {}; audio.removeAttribute('src'); try { audio.load() } catch (_) {}     // releases the network
  4. if (stopActive === halt) stopActive = null
  5. hideCaption(); setState(next)
  6. if (was) dispatch('listen:stop', { station, reason, index: at })

halt = (reason) => settle('idle', reason)

startClip(i, token):
  1. index = i; clip = queue[i]; setState('loading'); showCaption(clip, i)
  2. audio.setAttribute('src', clip.src)
  3. let p; try { p = audio.play() } catch (err) { if (token === run) fail(err); return Promise.resolve(false) }
  4. if (!p || typeof p.then !== 'function') { if (token === run) started(); return Promise.resolve(true) }       // very old browsers
  5. return p.then(() => { if (token !== run) return false; started(); return true },
                   (err) => { if (token !== run) return false; fail(err); return false })        // a stale AbortError is ignored

started():  setState('playing'); dispatch('listen:play', { station, segment: queue[index].id, index, count: queue.length })

fail(err):  settle('error', 'error')
            showError(err && err.name === 'NotAllowedError' ? 'Your browser would not start the sound. Press Listen again.'
                                                            : 'The audio did not load. Press Listen to try again, or read the page instead.')

play(segmentId = null):
  1. if (destroyed) return Promise.resolve(false)
  2. q = segmentId === null ? clips : clips.filter(c => c.id === segmentId); if (q.length === 0) return Promise.resolve(false)
  3. if (stopActive !== null && stopActive !== halt) stopActive('preempted')      // one voice at a time
  4. if (active()) settle('idle', 'stopped')                                      // restarting
  5. clearError(); queue = q; run += 1; stopActive = halt
  6. return startClip(0, run)

stop():  if (active()) settle('idle', 'stopped'); else if (state === 'error') { clearError(); setState('idle') }

onClick():       if (active()) settle('idle', 'stopped'); else play()                  // idle or error: (re)start
onEnded():       if (!active()) return
                 if (index + 1 < queue.length) { run += 1; startClip(index + 1, run) }  // no gap, no tap: same element, new src
                 else settle('idle', 'ended')
onAudioError():  if (state === 'idle' || destroyed) return; fail(audio.error)
onPause():       if (audio.ended || state !== 'playing') return; settle('idle', 'stopped')     // a hardware or OS pause; the natural end also fires pause, hence audio.ended

destroy():
  1. if (destroyed) return; destroyed = true
  2. settle('idle', 'destroyed')                        // fires listen:stop once, only if it was active
  3. remove the four listeners; button.remove(); audio.remove(); if (caption) caption.remove(); clearError()
```

State table (every transition):

| From | Trigger | To | Effects |
|---|---|---|---|
| idle or error | click, or `play()` | loading | other Listen stopped (`preempted`); transcript shown; `src` set; `audio.play()` called |
| loading | `play()` resolves | playing | `listen:play` |
| loading or playing | `play()` rejects, or `audio` `error` | error | `listen:stop` (`error`); error line; no further clip |
| playing | `ended`, more clips | loading | `startClip(index + 1)` (the previous clip's stop is not announced) |
| playing | `ended`, last clip | idle | `listen:stop` (`ended`) |
| loading or playing | click, `stop()`, or `pause` not at the end | idle | `listen:stop` (`stopped`) |
| loading or playing | another Listen starts | idle | `listen:stop` (`preempted`) |
| any | `destroy()` | gone | `listen:stop` (`destroyed`) if it was active; every node this call added removed |

Timing: no timer anywhere. Clips chain on `ended` with no artificial gap. The first clip starts after the browser fetches enough of
its mp3; a following clip costs one fetch (no prefetch in this iteration; the clips are small and the gap is tolerable).

### 5.6 `palette.py`

```python
"""Colours for the manim videos. These are the DARK theme tokens of css/theme.css under the mapping in docs/ARCHITECTURE.md 11.4
(BG --bg, SURFACE --surface, INK --text, MUTED --text-muted, CART --cart, POLAR --polar, INPUT --input, OUTPUT --output,
SEAM --seam, T0 --t0, T1 --t1, WARN --danger, OK --ok). tests/unit/i2-media-core.test.mjs compares every constant with the
`:root[data-theme="dark"]` block; change both together."""
BG = "#0d121c"  ...  OK = "#63d08a"          # thirteen NAME = "#rrggbb" lines, lower-case hex, in the order of section 3.2

def _rgb(h):   # '#rrggbb' (any case) → [r, g, b] ints
def _hex(v):   # three floats → '#rrggbb': each channel floor(x + 0.5), clamped to 0..255 (the same as JavaScript Math.round for x >= 0)
def _clamp01(t):   # 0.0 for a non-finite t, else min(1.0, max(0.0, t))

def mix(a, b, t):
    k = _clamp01(t); A = _rgb(a); B = _rgb(b)
    return _hex([A[i] + (B[i] - A[i]) * k for i in range(3)])

def ramp(base, t, weight=0.4):
    k = _clamp01(t); w = _clamp01(weight) if weight is finite else 0.4
    B = _rgb(base); C0 = _rgb(T0); C1 = _rgb(T1)
    return _hex([B[i] * (1 - w) + (C0[i] + (C1[i] - C0[i]) * k) * w for i in range(3)])      # keep this operation order: it is the plane.js order
```

### 5.7 Reading the dark block (test helper, for U1)

```
block = the text from ':root[data-theme="dark"] {' to the first '}' after it
pairs = every  --name: value;  in the block → { name: value }
palette = every line matching  /^([A-Z][A-Z0-9_]*)\s*=\s*"(#[0-9a-fA-F]{6})"/m  in palette.py → { NAME: '#hex' }
```

### 5.8 Building the narration files

1. The five station files are copied verbatim from section 2.6 (UTF-8, two-space indent, trailing newline).
2. `walk.json` is generated, never typed. From the repo root:
   ```
   node -e "import('./js/registry.js').then(({STATIONS}) => { const seg = STATIONS.map(s => '    ' + JSON.stringify({ id: s.id, text: s.walk.say })).join(',\n'); process.stdout.write('{\n  \"id\": \"walk\",\n  \"title\": \"The Walk: one sentence per stop\",\n  \"segments\": [\n' + seg + '\n  ]\n}\n'); })" > media/narration/site/walk.json
   ```
3. Re-run step 2 whenever a `walk.say` in `js/registry.js` changes; the unit test U4 fails until then.

### 5.9 Build order

1. `palette.py` and its cases U1, U2 (a few minutes; nothing depends on anything else).
2. The five station narration files (section 2.6, verbatim), `walk.json` (5.8), and U3 to U6 and U10.
3. The pure half of `listen.js` (5.1 to 5.3) and U7, U8, U9.
4. The DOM half (5.4, 5.5), then the interaction script of 7.3, run at all three views.
5. `npm test` (no previously green test turns red) and the A5 smoke of the five stations.

---

## 6. Mathematics

### 6.1 Formulas used

**Narration timing.** `narrated.py`: a segment lasts `max(1.5, words / 2.5) + 0.35` seconds when silent; the audio run replaces this
with the clip length. The totals in 2.6 use `words / 2.5`.

**Colour.** With `k = clamp(t, 0, 1)`, a channel of `mix(a, b, t)` is `a + (b − a)·k`, rounded as `floor(v + 0.5)`. With the weight
`w` (default 0.4), a channel of `ramp(base, t, w)` is `base·(1 − w) + (T0 + (T1 − T0)·k)·w`. Contrast ratio (WCAG): `(L₁ + 0.05) / (L₂ + 0.05)`
with `L = 0.2126 R + 0.7152 G + 0.0722 B` on linearised channels (`c ≤ 0.03928 ? c/12.92 : ((c + 0.055)/1.055)^2.4`).

**Complex numbers (the facts the narration speaks).**
- Modulus `|z| = √(x² + y²)`; `Arg z = atan2(y, x) ∈ (−π, π]` (`Arg` of a negative real is `π`); `z = r(cos θ + i sin θ) = r e^{iθ}`;
  `arg z = { Arg z + 2πk : k ∈ ℤ }`.
- n-th roots of `c = |c| e^{iΘ}` (Θ = Arg c): `|c|^{1/n} e^{i(Θ + 2πk)/n}`, `k = 0..n−1`; `k = n` repeats `k = 0`. Principal: `k = 0`.
- Branch of `z^{1/n}` with seam at angle σ: `r^{1/n} e^{iθ/n}` with `θ ∈ (σ, σ + 2π]`; principal σ = −π.
- Difference quotient at `z₀`, direction `h = ρe^{iφ}`: `(f(z₀ + h) − f(z₀))/h → A + B e^{−2iφ}`, `A = ½(f_x − i f_y)`, `B = ½(f_x + i f_y)`:
  a circle of centre A and radius |B|; the derivative exists exactly when `B = 0`, then `f′ = A = u_x + i v_x`.
- Cauchy–Riemann in (x, y): `u_x = v_y`, `u_y = −v_x`; in the polar coordinates of z: `u_r = v_θ / r`, `v_r = −u_θ / r`, and
  `f′ = e^{−iθ}(u_r + i v_r)`.

### 6.2 Worked solutions in both addresses (the unit-test expectations)

Tolerance 1e-9 unless a finite-difference derivative is involved (then 1e-6). Every value was recomputed with `js/core/complex.js`.

**1.3.1 — polar and exponential form of z = −1 + i√3, and Arg z.**
- Cartesian address: x = −1, y = √3. `r = √(1 + 3) = 2`. The point is in the second quadrant (x < 0, y > 0); `tan θ′ = |y/x| = √3`, so the reference angle is π/3 and `θ = π − π/3 = 2π/3` (120°). Arg z = 2π/3, which lies in (−π, π].
- Polar address: start from (2, 2π/3): `x = 2 cos(2π/3) = 2(−½) = −1`, `y = 2 sin(2π/3) = 2(√3/2) = √3`. They agree.
- Forms: `z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3}`. `arg z = { 2π/3 + 2πk }`; k = 1: 8π/3 (480°); k = −1: −4π/3 (−240°). The three degrees spoken in `home.names` and `staircase.names` (120, 480, −240) are k = 0, 1, −1.
- Test: `toPolar(C(−1, √3))` → `r = 2`, `theta = 2.0943951023931953` (2π/3); `argSet(z, { kMin: −1, kMax: 1 })` in degrees → `[−240, 120, 480]`; `fromPolar(2, 2π/3)` → `(−1, 1.7320508075688772)`.

**1.4.1 — the 5th roots of unity.**
- Polar address: `1 = 1·e^{i0}`, `arg 1 = { 2πk }`, so `z_k = e^{i2πk/5}`, k = 0..4: angles 0°, 72°, 144°, 216°, 288° (home steps 0, 72°, 144°, −144°, −72°). k = 5 gives 360° = k = 0.
- Cartesian address: `z_k = cos(2πk/5) + i sin(2πk/5)`: k = 0: 1; k = 1: 0.30901699437494745 + 0.9510565162951535i; k = 2: −0.8090169943749475 + 0.5877852522924731i; k = 3: −0.8090169943749475 − 0.5877852522924731i; k = 4: 0.30901699437494745 − 0.9510565162951535i. Exact: `cos 72° = (√5 − 1)/4`, `cos 144° = −(√5 + 1)/4`, `sin 72° = √(10 + 2√5)/4`, `sin 36° = √(10 − 2√5)/4`.
- Cartesian derivation (no angle): `z⁵ − 1 = (z − 1)(z⁴ + z³ + z² + z + 1)`. Divide the quartic by z² and put `w = z + 1/z = 2 cos θ`: `w² + w − 1 = 0`, so `w = (−1 ± √5)/2 = 0.6180339887498949` or `−1.618033988749895`, giving `cos θ = w/2 = 0.30901699437494745` (the 72° pair) and `−0.8090169943749475` (the 144° pair). It agrees with the polar route.
- Primitive: `gcd(k, 5) = 1` for k = 1..4, so all but 1 are primitive (`isPrimitiveRoot(k, 5)` false only for k = 0). The roots sum to 0.
- Test: `rootsOfUnity(5)` args in degrees `[0, 72, 144, −144, −72]`; coordinates as above; `|Σ z_k| < 1e-12`; each `z_k⁵ = 1` within 1e-12.

**1.4.2 — the 4th roots of −16, exponential and Cartesian forms.**
- Polar address: `−16 = 16e^{iπ}`, `arg(−16) = { π + 2πm }`. `z_k = 16^{1/4} e^{i(π + 2πk)/4} = 2e^{i(π/4 + kπ/2)}`, k = 0..3: angles π/4, 3π/4, 5π/4, 7π/4 (45°, 135°, 225°, 315°; home steps 45°, 135°, −135°, −45°).
- Cartesian address: `2e^{iπ/4} = 2(√2/2 + i√2/2) = √2 + √2 i`; the four are `√2 + √2 i`, `−√2 + √2 i`, `−√2 − √2 i`, `√2 − √2 i` (`√2 = 1.4142135623730951`).
- Cartesian derivation (no angle): `z⁴ = −16` means `z² = ±4i`. `(√2(1 + i))² = 2(1 + i)² = 2(2i) = 4i`, so `z = ±√2(1 + i)`; and `(√2(1 − i))² = −4i`, so `z = ±√2(1 − i)`. Same four points.
- Check in polar: `|z|⁴ = 2⁴ = 16`, `4 × 45° = 180°`, `16e^{iπ} = −16`. Each root to the 4th power is −16 within 1e-12. The sum of the four is 0.
- Test: `rootsOf(−16, 4)` → the four points above; args in degrees `[45, 135, −135, −45]`; `pow(root, 4)` → `(−16, 0)`; `sqrt(C(0, 4))` → `(√2, √2)`; `sqrt(C(0, −4))` → `(√2, −√2)`.

**1.4.3 — z² − 4z + 13 = 0 (spoken in `roots.quadratic`).**
- Cartesian: discriminant `b² − 4ac = 16 − 52 = −36`, `√(−36) = 6i`, `z = (4 ± 6i)/2 = 2 ± 3i`. Completing the square: `(z − 2)² = 4 − 13 = −9`.
- Polar: `−9 = 9e^{iπ}`, its square roots are `3e^{iπ/2} = 3i` and `3e^{i3π/2} = −3i` (all names, k = 0, 1); slide by 2: `2 + 3i`, `2 − 3i`. A mirror pair, since the coefficients are real.
- Test: `quadraticRoots(1, −4, 13)` → `[2 + 3i, 2 − 3i]`; `sqrt(−9)` → `(0, 3)`.

**2.2.2 — the principal square root of 2i.**
- Polar address: `|2i| = 2`, `Arg(2i) = π/2`. Principal: `|w|^{1/2} e^{i Arg(w)/2} = √2 e^{iπ/4} = √2(√2/2 + i√2/2) = 1 + i`. The other root uses the next name, `π/2 + 2π`: `√2 e^{i5π/4} = −1 − i`.
- Cartesian address: `(a + bi)² = 2i` gives `a² − b² = 0`, `2ab = 2`; so `a = b` and `a² = 1`: `±(1 + i)`. The principal root has non-negative real part: `1 + i`.
- Test: `principalRoot(C(0, 2), 2)` → `(1, 1)`; `rootsOf(C(0, 2), 2)[1]` → `(−1, −1)`; `Arg(C(0, 2)) = π/2`; `√2 = 1.4142135623730951`.

**2.4.1 — a branch of z^{1/3} continuous along the negative real axis.**
- Polar address: `f(z) = r^{1/3} e^{iθ/3}` with `0 < θ < 2π` (seam σ = 0, the cut on the positive real axis). On the negative real axis `θ = π`, so `f(−r) = r^{1/3} e^{iπ/3}`; at `z = −1`: `e^{iπ/3} = ½ + (√3/2)i = (0.5, 0.8660254037844386)`. Continuous there: approaching from above or below, θ → π either way.
- Cartesian address: take `z = −1 ± iε`. Both sit at angle π ∓ ε′ in the window (0, 2π), so both images tend to `e^{iπ/3}`. For the principal branch (σ = −π) the point just below the axis has Arg ≈ −π, so its image tends to `e^{−iπ/3} = (0.5, −0.866…)`: a jump of `|e^{iπ/3} − e^{−iπ/3}| = 2 sin(π/3) = √3 = 1.7320508075688772`. The branch with the cut at 0 has its own jump on the positive axis: `|1 − e^{i2π/3}| = √3`.
- Check: `f(−1)³ = e^{iπ} = −1`.
- Test: `branchRoot(−1, 3, 0)` → `(0.5, 0.8660254037844386)`; `branchRoot(−1, 3, −π)` → the same (Arg(−1) = π); `branchRoot(C(−1, −1e-12), 3, −π)` → `(0.5, −0.866…)` within 1e-9; `branchRoot(C(−1, ∓1e-12), 3, 0)` → `(0.5, 0.866…)` both; `pow(branchRoot(−1, 3, 0), 3)` → `(−1, 0)`.

**3.1.1 — f(z) = z² + z, differentiable everywhere, f′.**
- Cartesian (Δz = h): `(f(z + h) − f(z))/h = (2zh + h² + h)/h = 2z + 1 + h → 2z + 1`.
- Polar (h = ρe^{iφ}): `2z + 1 + ρe^{iφ}`; as ρ → 0 the last term vanishes whatever φ is, so the circle of quotients `A + B e^{−2iφ}` has `B = 0`: a single point, `f′ = 2z + 1`. At `z₀ = 1 + i`: `f′ = 3 + 2i`, whose polar address is `|f′| = √13 = 3.605551275463989` (the local stretch) and `Arg f′ = atan2(2, 3) = 0.5880026035475675` rad = 33.690067525979785° (the local turn).
- Test: `localLinear(z² + z, 1 + i)` → `A = (3, 2)`, `|B| < 1e-6`; `|3 + 2i| = 3.605551275463989`; `Arg = 0.5880026035475675`.

**3.1.2 — f(z) = |z|² differentiable only at 0 (spoken in `derivative.abs2`).**
- Cartesian: along the real axis `(|z + t|² − |z|²)/t = 2x + t → 2x`; along the imaginary axis `(|z + it|² − |z|²)/(it) = −i(2y + t) → −2iy`. A real number `2x` equals the imaginary number `−2iy` only when both are 0: `x = y = 0`.
- Polar (h = ρe^{iφ}): `(|z + h|² − |z|²)/h = z·conj(h)/h + conj z + conj h = conj z + z e^{−2iφ} + ρe^{−iφ} → conj z + z e^{−2iφ}`: a circle of centre `conj z` and radius `|z|`; a point exactly when `z = 0`, and then `f′(0) = 0`.
- At `z₀ = 1 + i`: centre `1 − i`, radius `√2`; φ = 0 gives `(1 − i) + (1 + i) = 2` and φ = π/2 gives `(1 − i) − (1 + i) = −2i`, matching the two Cartesian path limits `2x = 2` and `−2iy = −2i`.
- Test: `localLinear(|z|², 1 + i)` → `A = (1, −1)`, `B = (1, 1)`, `|B| = 1.4142135623730951`; `directionalQuotients(f, 1 + i, 1e-6, 4)` → `[2, −2i, 2, −2i]` within 1e-5; `localLinear(|z|², 0)` → `A = B = 0`.

**P6 (spoken in `derivative.mirror`) — Re z and conj z.**
- `Re z`: `Re h / h = cos φ e^{−iφ} = ½ + ½ e^{−2iφ}`: a circle of centre ½ and radius ½ (through 1 at φ = 0 and 0 at φ = π/2) at every point, so nowhere differentiable. `A = B = ½`.
- `conj z`: `conj(h)/h = e^{−2iφ}`: centre 0, radius 1; the circle never shrinks. `A = 0`, `B = 1`.
- Test: `localLinear(Re, any)` → `A = B = (0.5, 0)`; `localLinear(conj, any)` → `A = (0, 0)`, `B = (1, 0)` (1e-9).

**3.2.1 — f(z) = e^x(cos y + i sin y) is entire; f′.**
- Cartesian: `u = e^x cos y`, `v = e^x sin y`. `u_x = e^x cos y = v_y`; `u_y = −e^x sin y = −v_x`. The partials are continuous everywhere, so f is entire (Thm 3.2.6), and `f′ = u_x + i v_x = e^x cos y + i e^x sin y = f`.
- Polar: the value has modulus `e^x` and Arg `y` (mod 2π): the move that stretches by `e^x` and turns by `y`; `f′ = f` has the same polar address. In the polar coordinates of z: `u_r = e^x cos(y + θ)`, `v_r = e^x sin(y + θ)`, `v_θ/r = u_r`, `−u_θ/r = v_r` (the polar Cauchy–Riemann equations hold), and `f′ = e^{−iθ}(u_r + i v_r) = e^{−iθ}·e^{x} e^{i(y + θ)} = f`.
- Numbers at `z₀ = 1 + i`: `f = e(cos 1 + i sin 1) = 1.4686939399158851 + 2.2873552871788423i`, `|f| = e = 2.718281828459045`, `Arg f = 1`; `u_x = v_y = 1.4686939399158851`, `u_y = −v_x = −2.2873552871788423`. At `z₀ = iπ/2`: `f = f′ = i`. At `z = 1.3e^{i0.7}` (r = 1.3, θ = 0.7): `x = 0.9942948434698351`, `y = 0.8374829934089983`, `f = 1.8090904742952907 + 2.0080875222789234i`, `u_r = v_θ/r = 0.09002321598214935`, `v_r = −u_θ/r = 2.70131813415275`, and `e^{−0.7i}(u_r + i v_r) = f`.
- Test: `jacobian(f, 1 + i)` within 1e-6 of the numbers above; `localLinear(f, 1 + i).A` = `f(1 + i)` and `|B| < 1e-6`; `f(iπ/2)` = `(0, 1)`; the polar CR identities at (1.3, 0.7) within 1e-5 from central differences (h = 1e-6).

**2.1.2 — the image of x = 2 under w = z² (spoken in `lab.predict`).**
- Cartesian: `z = 2 + iy`, `w = 4 − y² + 4iy`; `u = 4 − y²`, `v = 4y`; eliminate y: `u = 4 − v²/16`. A parabola, vertex 4, opening left; `v² = −16(u − 4)` has `4p = −16`, `p = −4`, so the focus is at `4 + p = 0`.
- Polar: the line is `r cos θ = 2`, `r = 2 sec θ`; under z² the polar address becomes `(ρ, ψ) = (4 sec²θ, 2θ)`, and `cos²θ = (1 + cos ψ)/2` gives `ρ(1 + cos ψ) = 8`, i.e. `ρ + u = 8`: a conic with its focus at the origin (eccentricity 1). Squaring `ρ = 8 − u` gives `v² = 64 − 16u`, the same parabola.
- Test: for y in `[−3, −1, 0, 1, 2.5]` the image `(2 + iy)²` has `u = 4 − v²/16` and `ρ(1 + cos ψ) = 8`; the moduli ρ are `13, 5, 4, 5, 10.25`.

### 6.3 Spoken claims, and what pins each

| File / segment | Claim spoken | Pinned by |
|---|---|---|
| home.move | −1 + i√3: one left, √3 up; turn 120°, length 2 | 1.3.1 test |
| home.names, staircase.names | 120°, 480° and −240° are names of one dot | 1.3.1 test (`argSet` degrees) |
| staircase.home, staircase.jump | Arg in (−π, π]; the home step jumps between π and −π at the seam | `wrapArg`, 2.4.1 test (the principal jump) |
| staircase.branch | seam on the positive axis, θ in (0, 2π); cube root of −1 is e^{iπ/3} = ½ + (√3/2)i | 2.4.1 test |
| roots.five | names 0, 360, 720 divided by 5 give 0, 72, 144; five dots 72° apart; step 5 is step 0 | 1.4.1 test |
| roots.minus-sixteen, roots.check | length 2; angles 45, 135, 225, 315; Cartesian ±√2 ±√2 i; 2⁴ = 16 and 4 × 45° = 180° | 1.4.2 test |
| roots.quadratic | (z − 2)² = −9; roots 2 ± 3i | 1.4.3 test |
| roots.principal | 2i has length 2 and home angle 90°; principal root length √2 at 45° = 1 + i; other root −1 − i | 2.2.2 test |
| derivative.number | f′ = u_x + i v_x; length is the local stretch, angle the local turn | 3.1.1 and 3.2.1 tests |
| derivative.circle | centre A (move part), radius \|B\| (mirror part); exists exactly when it is a point | 3.1.1 and 3.1.2 tests |
| derivative.mirror | conj never shrinks (radius 1); Re z has radius ½; z² + z has f′ = 2z + 1 | P6 and 3.1.1 tests |
| derivative.abs2 | radius \|z\|, centred on conj z; a point only at 0 | 3.1.2 test |
| derivative.exp | CR: u_x = v_y, u_y = −v_x; e^x(cos y + i sin y) is entire, f′ = f; stretch e^x, turn y | 3.2.1 test |
| lab.predict | x = 2 under z² is a parabola opening left, focus at 0 | 2.1.2 test |
| lab.addresses | a Cartesian grid bends under squaring, a polar grid stays polar | STORY section 1 (the polar grid maps to a polar grid under zⁿ: `(r, θ) → (r², 2θ)`) |

---

## 7. Verification plan

All commands run from the repo root. At design time `npm test` runs 801 tests of which 9 are red by design until wave 1 (the plan's notes
name them: I1, U3, U4, U5, U10, the three A1 data tests and `groupStations`); with this goal's file the suite is 811 tests with the same 9
red. Review B of this goal looks only at the new file and at "no previously green test turned red".

### 7.1 Per acceptance criterion

| Id | Command | Passing looks like |
|---|---|---|
| A1 | `node --test tests/unit/i2-media-core.test.mjs` (cases U1, U2) | `palette.py` constants equal the dark block, 13 names exactly, both dark blocks equal; helper values match 6.2 |
| A2 | same file (U3 to U6) | six JSON files well formed; walk equals the registry; spine, arg/Arg, both addresses (five files) and the ear-first rule hold; the numeric facts of 6.2 hold |
| A3 | same file (U7, U8) | `loadManifest` identity, `videoFor`, `clipsFor`, cache reset, and the staged-copy variants (absent, valid, malformed, syntax error) |
| A4 | `node tools/smoke.mjs --route staircase --script tests/interact/i2-media-core.mjs --dark --out docs/review/iter-2/i2-media-core` | `ok   staircase (desktop)`, `(phone)` and `(desktop-dark)` lines, each with "expected error line(s) ignored" for the 404s of the fake media, and `3/3 checks passed across 1 route(s).` |
| A5 | `node tools/smoke.mjs --route home,staircase,roots,derivative,lab --dark` | `15/15 checks passed across 5 route(s).` with no problem lines |
| A6 | same unit file (U9) plus `grep -n '^import' js/core/listen.js` (no output) and `grep -n 'console.error' js/core/listen.js` (no output) and `grep -n 'data-for' js/core/listen.js` (no output) | static rules hold; `console.warn` appears only in the catch of `readManifest` and in the dropped-entries notice of `normalise`, each at most once per page load (cases U8) |

### 7.2 Unit tests: `tests/unit/i2-media-core.test.mjs` (Node 22, `node:test`)

Imports: `fs`, `path`, `os`, `child_process`, `url`, `node:test`, `node:assert/strict`; `../../js/registry.js`, `../../js/core/complex.js`,
`../../js/core/plane.js` (for `mixColor`), `../../js/core/listen.js`. ROOT is two levels above the test file.

**U1 — palette equals the dark tokens (A1).** Read `css/theme.css`; take the block from `:root[data-theme="dark"] {` to the first `}`; parse
`--name: value;` pairs; parse `palette.py` with the regex of 5.7. Expected literal table, also written in the test so a theme change is noticed:

| Name | Expected |
|---|---|
| BG | `#0d121c` |
| SURFACE | `#151c2b` |
| INK | `#e9edf5` |
| MUTED | `#a6b0c3` |
| CART | `#62adf2` |
| POLAR | `#ff9d5c` |
| INPUT | `#3fd0a0` |
| OUTPUT | `#e48fd2` |
| SEAM | `#8e99b0` |
| T0 | `#5c7498` |
| T1 | `#f3f6fb` |
| WARN | `#ff8178` |
| OK | `#63d08a` |

Cases: each of the 13 equals both the literal and the mapped token (case-insensitive); the set of names parsed from `palette.py` is
exactly these 13 (no stale extra); the `@media (prefers-color-scheme: dark)` block (`:root:not([data-theme="light"]) {`) has the same
value for each of the 13 tokens as the explicit block.

**U2 — palette runs and its helpers match the site (needs `python3`; `t.skip` when absent).** Run
`python3 -I -c "import importlib.util, json, sys; s = importlib.util.spec_from_file_location('palette', sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(<expression>))" videos/lib/palette.py`.
Expected helper values:

| Call | Expected |
|---|---|
| `mix(T0, T1, 0)` / `0.5` / `1` | `#5c7498` / `#a8b5ca` / `#f3f6fb` |
| `mix(T0, T1, -1)` / `2` / `nan` | `#5c7498` / `#f3f6fb` / `#5c7498` |
| `ramp(INPUT, 0)` / `0.5` / `1` | `#4bab9d` / `#69c5b1` / `#87dfc4` |
| `ramp(OUTPUT, 0)` / `1` | `#ae84bb` / `#eab8e2` |
| `ramp(INPUT, 0.3, 0)` | `#3fd0a0` (weight 0 is the base colour) |
| `ramp(INPUT, 0.5, 1)` | `#a8b5ca` (weight 1 is the pure ramp, equal to `mix(T0, T1, 0.5)`) |

Also: the constants dict printed by Python (upper-case string attributes) equals the regex-parsed map (the file is valid Python and the
regex sees what Python sees); and for the five colour pairs `(T0,T1)`, `(CART,POLAR)`, `(INPUT,OUTPUT)`, `(BG,INK)`, `(SEAM,OK)` and
t in `{0, 0.25, 0.5, 0.75, 1}`, `mix` equals `plane.js` `mixColor` (parse its `rgb(r, g, b)` string to hex). The luma of `ramp(INPUT, t)`
for t = 0, 0.25, 0.5, 0.75, 1 is strictly increasing (149.6, 162.8, 176.0, 189.2, 202.3).

**U3 — narration shape (A2).** For each of the six files: parses; `id` equals the file base name; `title` is a non-empty string; every
segment has a string `id` matching `/^[a-z0-9-]+$/` (unique within the file) and a non-empty string `text`; no text contains `$` or a
backslash. Station files: 4 to 6 segments, every text 8 to 70 words under **both** `text.trim().split(/\s+/)` and `text.match(/[A-Za-z']+/g)`.
Expected counts: home 6, staircase 6, roots 6, derivative 6, lab 5, walk 22.

**U4 — the Walk (A2).** `walk.json` segment ids equal `STATIONS.map(s => s.id)` in order (22), and each text equals `STATIONS[i].walk.say` exactly.

**U5 — the spine and the vocabulary (A2 and D11).** `home.json` texts joined contain `A complex number is a move`, `A turn has many names`,
`A function moves every point at once`, `Differentiable means`. The joined texts of each of the **five station files** contain `Cartesian` and
`polar` (S1: not `walk.json`). `staircase.json` contains both `arg z` and `Arg z`. Ear-first: no station-file text contains a digit or any of
`= ^ _ { } < > + * /`. Pins (each substring present in the file's joined text):

| File | Substrings |
|---|---|
| home | `minus one plus i root three`, `a hundred and twenty degrees`, `length two`, `Rehearsal Room`, `twenty-two places`, `two decisions` |
| staircase | `Capital Arg z`, `minus pi`, `pi over three`, `one half plus root three over two`, `four hundred and eighty`, `minus two hundred and forty`, `seam` |
| roots | `seventy-two`, `forty-five`, `a hundred and thirty-five`, `two hundred and twenty-five`, `three hundred and fifteen`, `root two`, `two plus three i`, `two minus three i`, `one plus i`, `minus one minus i`, `step zero again` |
| derivative | `u sub x`, `v sub y`, `minus v sub x`, `two z plus one`, `radius one half`, `Cauchy-Riemann`, `centre is the move part, A`, `nowhere else` |
| lab | `Replay`, `Reveal`, `focus at zero`, `parabola`, `Functions built from moves keep circles and rays` |

**U6 — the numbers behind the spoken claims (6.2).** One case per problem with the expected values of 6.2: 1.3.1 (r 2, theta
2.0943951023931953, degrees `[−240, 120, 480]`); 1.4.1 (args `[0, 72, 144, −144, −72]`, coordinates, `w = z + 1/z` roots
0.6180339887498949 and −1.618033988749895, sum 0); 1.4.2 (four points, args `[45, 135, −135, −45]`, fourth powers −16, `sqrt(4i)`); 1.4.3
(`2 ± 3i`); 2.2.2 (`1 + i`, `−1 − i`); 2.4.1 (the three `branchRoot` values and the jump √3); 3.1.1 (`3 + 2i`, `|B| < 1e-6`, polar
`√13` and 0.5880026035475675); 3.1.2 (`A = 1 − i`, `B = 1 + i`, quotients `[2, −2i, 2, −2i]`, zero at 0); P6 (`A = B = ½`;
`A = 0, B = 1`); 3.2.1 (`f(1 + i)`, the Jacobian, `f(iπ/2) = i`, the polar CR identities at (1.3, 0.7)); 2.1.2 (the five y values, `u = 4 − v²/16`
and `ρ(1 + cos ψ) = 8`, moduli `13, 5, 4, 5, 10.25`).

**U7 — `loadManifest`, `videoFor`, `clipsFor` on the real module (A3).**
- `const p1 = loadManifest(); assert.equal(loadManifest(), p1)`; `const m = await p1`: `Array.isArray(m.VIDEOS)`; `m.SITE_AUDIO` is a plain object (not null, not an array); the real file is **not** asserted empty (S2).
- `resetManifestCache(); const p3 = loadManifest(); assert.notEqual(p3, p1); await p3`.
- `videoFor({ VIDEOS: [{ id: 'a' }] }, 'a').id === 'a'`; `videoFor(m, 'b') === null`; `videoFor(null, 'a')`, `videoFor({}, 'a')`, `videoFor({ VIDEOS: 'x' }, 'a')` are `null`; `videoFor({ VIDEOS: [null, { id: 'a' }] }, 'a').id === 'a'`; with `[{ id: 'a', n: 1 }, { id: 'a', n: 2 }]` the result has `n === 1`.
- `clipsFor({ SITE_AUDIO: { s: { clips: [{ id: 'x' }] } } }, 's')` has length 1; `clipsFor(m, 'none')` deep-equals `[]`; `clipsFor({ SITE_AUDIO: { s: { clips: 'x' } } }, 's')` is `[]`; `clipsFor({ SITE_AUDIO: {} }, 'constructor')` and `'__proto__'` are `[]`; two calls return different arrays (`!==`) and pushing onto one does not change the manifest; inputs are not mutated (deep clone before and after).

**U8 — `loadManifest` against staged copies (A3, A6).** A helper `stage(manifestSource | null)` makes a temp directory `<tmp>/js/core/listen.js` (a copy of the real file), a `<tmp>/package.json` of `{"type":"module"}`, and, when given, `<tmp>/media/manifest.js`; it imports the copy by `pathToFileURL`. `console.warn` and `console.error` are replaced by recorders for each case and restored after; temp directories are removed in `after`.

| Case | Manifest source | Expected |
|---|---|---|
| absent | none | resolves `{ VIDEOS: [], SITE_AUDIO: {} }` (deep equal); exactly one `console.warn` whose first argument starts with `[mv]`; zero `console.error`; a second `loadManifest()` is the same promise and adds no warning |
| valid | `VIDEOS` with one full entry (`v1`: title `T`, summary `S`, station `staircase`, src `media/video/v1.mp4`, captions `media/video/v1.vtt`, seconds 150, narrated false, music false) and `SITE_AUDIO.staircase = { title: 'Staircase', clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] }` | resolves a deep-equal copy; zero warnings |
| malformed | `VIDEOS: [null, { id: 'x' }, { id: 5, src: 'a' }, { id: 'v2', src: 'media/video/v2.mp4' }, { id: 'v2', src: 'dup.mp4' }]`; `SITE_AUDIO = JSON.parse('{"__proto__":{"clips":[]},"bad":5,"s":{"clips":[{"id":"ok","src":"a.mp3"},{"id":"nosrc"},7]}}')` | `VIDEOS` has one entry, `{ id: 'v2', title: 'v2', summary: '', station: null, src: 'media/video/v2.mp4', captions: null, seconds: 0, narrated: false, music: false }`; `SITE_AUDIO` has the single key `s` = `{ title: 's', clips: [{ id: 'ok', text: '', src: 'a.mp3' }] }`; `Object.getPrototypeOf(SITE_AUDIO) === Object.prototype`; exactly one `console.warn`, whose first argument is `[mv] media/manifest.js: ignored 8 malformed entries.` (four dropped videos: `null`, no `src`, a numeric `id`, the duplicate; four dropped site items: `__proto__`, `bad`, the clip without `src`, the clip `7`); zero `console.error` |
| syntax error | `export const VIDEOS = [` | empty manifest; one `console.warn`; zero `console.error` |
| wrong types | `export const VIDEOS = 'x'; export const SITE_AUDIO = null;` | empty manifest; at most one `console.warn` |

**U9 — static rules (A6, D1, D2).** Read `js/core/listen.js` as text. No line matches `/^\s*import\b(?!\()/` and no line starts with `import`; the file contains the
literal `import('../../media/manifest.js')` exactly once; no `console.error`, no `data-for`, no `innerHTML`, no `alert(`, no `window.open`, no
`iframe`. `Object.keys(await import('../../js/core/listen.js')).sort()` equals `['clipsFor', 'listenControl', 'loadManifest', 'resetManifestCache', 'videoFor', 'videoPanel']`.
The source mentions `'metadata'`, `'controls'`, `'playsinline'`, `'captions'`, `'default'`. Signatures: locate the first `###` heading in
`docs/ARCHITECTURE.md` whose line contains `js/core/listen.js` (it is `11.4` now and becomes `3.17` after the integrator promotes it; the test must not
depend on the number), take the first fenced code block (language `js`) under it, and for each `export function name(params)` line compare the normalised parameter list
(strip `//` comments, collapse whitespace, trim the space inside parentheses and a trailing comma) with the same function in the source; use balanced
parentheses, not a regex up to `)`, because the defaults contain parentheses. Importing the module leaves `typeof document === 'undefined'`.

**U10 — narration is wired for the audio run.** Each of the six files, written to a temp `site/` directory, makes `node tools/media/generate-audio.mjs --dry-run --group site --narration-dir <tmp> --audio-dir <tmp2>`
print `51 clip(s) to generate.` (29 station clips plus 22 walk clips), list 51 lines that begin `  speech`, and exit 0 (a dry run makes no network call and writes nothing; verified against the tool as it is today).

### 7.3 Interaction script: `tests/interact/i2-media-core.mjs`

Run: `node tools/smoke.mjs --route staircase --script tests/interact/i2-media-core.mjs --dark --out docs/review/iter-2/i2-media-core`. The harness
runs the script at 1280×860, 390×844 and 1280×860 dark; every step must hold at all three. The script imports `../../js/registry.js` only if it needs it,
builds its fixtures in the page, and removes them at the end.

```js
export const expectedErrors = [
  /^HTTP 404: \S+\/media\/(?:video\/staircase-roots\.(?:mp4|vtt)|audio\/site\/staircase\/intro\.mp3)$/,
  /^request failed: \S+\/media\/(?:video\/staircase-roots\.(?:mp4|vtt)|audio\/site\/staircase\/intro\.mp3)/,
  /^console\.error: Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
];
```

Fixtures. In one `page.evaluate`: `L = await import(new URL('./js/core/listen.js', location.href).href)`; a host `section#i2m-host` appended to `#view` (`margin: 16px 0`);
`window.__i2m = { L, host }`. Helpers: `silentWav(seconds)` builds a 16-bit mono 8000 Hz PCM WAV of silence in a `Blob` and returns a `blob:` URL
(header, little endian: `RIFF`, `36 + dataBytes`, `WAVE`, `fmt `, 16, 1, 1, 8000, 16000, 2, 16, `data`, `dataBytes`, then `seconds × 8000 × 2` zero bytes).
`ov = () => document.documentElement.scrollWidth - document.documentElement.clientWidth`.

Steps (numbers are the expected values; the reference prototype passed every one at all three views):

1. **Real manifest.** `const real = await L.loadManifest()`; `L.loadManifest() === L.loadManifest()`; `Array.isArray(real.VIDEOS)`. `expectNull = L.videoFor(real, 'staircase-roots') === null`; `r = await L.videoPanel(host, 'staircase-roots')`; assert `(r === null) === expectNull` and `host.children.length === (expectNull ? 0 : 1)` (S2). If a panel was added, remove it. Same for `L.listenControl(host, 'staircase')` against the valid clips of `L.clipsFor(real, 'staircase')` (`id` and `src` non-empty strings): null exactly when there are none, otherwise `host.children.length === 2`; destroy it if created.
2. **Video panel with the explicit manifest** `M = { VIDEOS: [{ id: 'staircase-roots', title: 'T', summary: 'S', station: 'staircase', src: 'media/video/staircase-roots.mp4', captions: 'media/video/staircase-roots.vtt', seconds: 150, narrated: false, music: false }], SITE_AUDIO: {} }`.
   `panel = await L.videoPanel(host, 'staircase-roots', { manifest: M })`; then, **in the same synchronous turn** (before any network event can arrive): `panel.id === 'video-staircase-roots'`; `panel.matches('section.panel.video-panel[data-video="staircase-roots"][data-tone="accent"]')`;
   `h2#video-staircase-roots-title` textContent is `Watch (2–3 min): T`; `p#video-staircase-roots-summary` textContent is `S · 150 s · Silent, with captions`;
   `video#video-staircase-roots-player[controls][playsinline][preload="metadata"]` exists, `video.autoplay === false`, no `autoplay` and no `loop` attribute;
   `source[src$="staircase-roots.mp4"][type="video/mp4"]`; `track[kind="captions"][default][src$="staircase-roots.vtt"]`; `panel.getAttribute('aria-labelledby')` is the h2's id; `video.getAttribute('aria-describedby')` is the summary's id;
   `p#video-staircase-roots-error[role="alert"]` has `hidden === true`. Layout: the video's width is at most the panel's width (918 of 952 at 1280, 324 of 358 at 390) and at least 250 px at 390 px; `|height / width − 9/16| < 0.02` (the reference: exactly 0); `ov() <= 1`.
   Token check: a probe `div` with `style.background = 'var(--surface)'` has the same computed colour as `getComputedStyle(panel).backgroundColor`; `getComputedStyle(panel).borderTopWidth === '4px'` and `borderTopColor` equals a probe whose `style.color = 'var(--accent)'`; and the panel's background is `rgb(21, 28, 43)` when `matchMedia('(prefers-color-scheme: dark)').matches` and `rgb(255, 255, 255)` otherwise (the harness's `desktop-dark` view is the dark one).
3. **Error path.** `page.waitForFunction` until `#video-staircase-roots-error` is not `hidden` (timeout 5000 ms); then `panel.dataset.state === 'error'`, the player's `style.display === 'none'`, and the error text equals `The video did not load. Everything else on this page works without it.` `await ctx.shot('video-error')`.
4. **Idempotence and options.** A second `await L.videoPanel(host, 'staircase-roots', { manifest: M })` returns the same element and `host.children.length === 1`. In a second host (a `section` appended to `body`): `{ title: 'Watch', manifest: M }` gives the heading `Watch: T`; `{ manifest: { VIDEOS: [{ id: 'staircase-roots', src: '' }] } }` and `{ manifest: { VIDEOS: [] } }` resolve `null` and leave that host empty. `await L.videoPanel(null, 'x')` rejects with a `TypeError` (catch it in the page and return `e.name`). Remove both hosts' panels.
5. **Listen control, absent and present** (A4). `await L.listenControl(host, 'staircase', { manifest: { VIDEOS: [], SITE_AUDIO: {} } })` resolves `null`; so does `{ SITE_AUDIO: { staircase: { title: 'x', clips: [] } } }`, and so does `segment: 'nope'` with `M2` below; the host stays empty.
   With `M2 = { VIDEOS: [], SITE_AUDIO: { staircase: { title: 'Staircase', clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] } } }`:
   `listen = await L.listenControl(host, 'staircase', { manifest: M2 })`; `listen.el.matches('button#staircase-listen.listen[aria-pressed="false"]')`; `listen.el.type === 'button'`; `listen.el.textContent === 'Listen'`; `listen.el.className` is `btn btn-quiet listen`;
   `host.querySelector('audio#staircase-listen-audio[preload="none"]') === listen.audio`; `listen.audio.hasAttribute('controls') === false`; `listen.audio.getAttribute('src') === null`; `listen.clips.length === 1`; `listen.playing === false`; `listen.el.dataset.state === 'idle'`;
   no `performance.getEntriesByType('resource')` entry contains `staircase/intro.mp3` (nothing is fetched before a click); `host.children.length === 2`.
   Size: `listen.el.getBoundingClientRect().height` is 44 (assert at least 43.5), its width is 83.7 at both viewports and at most `innerWidth`, `ov() <= 1`.
   `listen.destroy()`: `host.children.length === 0`, `document.getElementById('staircase-listen') === null` and likewise `'staircase-listen-audio'`; a second `destroy()` does not throw. With `{ id: 'x-listen', label: 'Hear it', manifest: M2 }`: `button#x-listen` has the text `Hear it` and `audio#x-listen-audio` exists; destroy it.
6. **Playing** (the happy path, with a real `page.click` so the browser allows sound). `url = silentWav(0.6)` (two clips of 0.6 s: 0.35 s also works but leaves a short window to poll); `M3 = { VIDEOS: [], SITE_AUDIO: { staircase: { title: 'Staircase', clips: [{ id: 'a', text: 'First clip', src: url }, { id: 'b', text: 'Second clip', src: url }] } } }`;
   `listen = await L.listenControl(host, 'staircase', { manifest: M3 })`. Before clicking, add listeners on `listen.el` that record each `listen:play` detail, the text of `#staircase-listen-caption` at that moment, and each `listen:stop` detail.
   `await page.click('#staircase-listen')`; wait (3000 ms) until a `listen:play` was recorded or `data-state` is `error`; log which.
   - **If it plays** (what the reference run did, at all three views): wait (6000 ms) for a recorded `listen:stop`. The recorded `listen:play` details are, in order, `{ station: 'staircase', segment: 'a', index: 0, count: 2 }` and `{ station: 'staircase', segment: 'b', index: 1, count: 2 }`; the captions read at those moments are `1 of 2 · First clip` and `2 of 2 · Second clip`; there is exactly one `listen:stop`, `{ station: 'staircase', reason: 'ended', index: 1 }` (the chain between the clips is not announced); afterwards `aria-pressed === 'false'`, `data-state === 'idle'`, `#staircase-listen-caption` is `hidden` with empty text, `listen.audio.getAttribute('src') === null`, `listen.el.dataset.clip === undefined`, and the mark is `hidden`.
   - **If the environment refuses audio** (no output device): `data-state === 'error'`, `aria-pressed === 'false'`, `p#staircase-listen-error[role="alert"]` exists, the mark reads `!`; assert the recovery instead: a second click does not leave two error lines (`document.querySelectorAll('#staircase-listen-error').length <= 1`).
   Destroy the control.
7. **Stop, restart, keyboard.** A new control over two 3-second clips (`silentWav(3)`); `listen.stop()` while idle fires no `listen:stop`. Click (wait for a `listen:play`, else skip steps 7 to 9 with a log line), assert `aria-pressed === 'true'`, `await ctx.shot('listen-playing')`, click again: the recorded reasons are `['stopped']`, `aria-pressed === 'false'`, `listen.audio.paused === true`, `getAttribute('src') === null`. Then `page.focus('#staircase-listen')` and `page.keyboard.press('Space')`: `aria-pressed` is `'true'` within 1500 ms; press `Enter`: it is `'false'` within 1500 ms.
8. **Segment mode and preemption.** `l2 = await L.listenControl(host, 'staircase', { id: 'seg', segment: 'b', manifest: M3 })`: `l2.clips.length === 1`, `l2.clips[0].id === 'b'`. With the first control playing, click `#seg`: the first control's last recorded reason is `'preempted'` and its `aria-pressed` is `'false'`; `#seg` is `'true'`; no element `#seg-caption` exists (single-segment mode).
9. **Destroy while playing.** With `#seg` playing, add a `listen:stop` listener on the host that records reasons, call `l2.destroy()`, remove the listener: the reasons are `['destroyed']` (the event bubbles from the button before it is removed), `#seg` and `#seg-audio` are gone from the document, and the removed audio element is `paused`.
10. **Teardown and verdict.** Destroy every control that is left **before** removing the host (a removed playing `<audio>` pauses by itself, which makes the control fire a late `listen:stop` into whatever is still listening, and a listener that reads `window.__i2m` after it was deleted is a page error: remove such listeners first). Revoke the blob URLs, remove the host, `delete window.__i2m`; `ov() <= 1`; one `ctx.log` line per step. A thrown assertion fails the route.

What passing looks like at the harness: for each of the three views `ok   staircase (<view>)  (N expected error line(s) ignored)  → <screenshots>`, then `3/3 checks passed across 1 route(s).`;
the screenshots `staircase--desktop--video-error.png`, `staircase--phone--video-error.png` and `staircase--desktop-dark--video-error.png` show the 4 px accent rule, the heading, the muted summary, the error sentence and no player;
`--listen-playing` shows `Listen ■` with the transcript line beneath it at 1280 and wrapped at 390.

### 7.4 What Review A and Review B should look at

Review A (against this design): the six exports and their exact signatures; no `data-for`, no static import; the DOM structure and ids of 2.3; the state table of 5.5 (every row has a test step); palette values and helpers; the six narration files equal to section 2.6 and to the registry. Review B (against the goal): A1 to A6 by the commands of 7.1, the screenshots above in both themes and at both widths, and the unchanged smoke of the five stations.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases (each has a place in the tests above or is covered by construction).**

| # | Case | Behaviour |
|---|---|---|
| E1 | `media/manifest.js` missing, a syntax error, wrong exported types | one `console.warn`, the empty manifest; no station notices. A missing file also makes the browser log its own failed-fetch line, which is why the manifest is always committed (the writer emits an empty one) and always copied by `tools/publish/build-site.mjs`. |
| E2 | A listed video file was deleted (404) | error line, player hidden (`data-state="error"`), the page is unaffected. |
| E3 | `captions` is `null` | no `<track>`; the summary says `Silent` or `With voice`. |
| E4 | A clip file is missing or undecodable | error state, error line, the button works again (a press retries from clip 1). |
| E5 | The browser blocks `play()` (iOS may do so for a later clip) | `NotAllowedError` gives the "would not start the sound" line; a press starts again from the first clip. |
| E6 | Two Listen controls (station and Walk bar) | the second to start stops the first (`preempted`). A Listen and a playing `<video>` can overlap; the video panel does not interfere (a narrated video and Listen on one page is not a case this iteration builds). |
| E7 | The station unmounts while playing | `destroy()` stops and removes it. If a station forgets, the removed `<audio>` pauses by itself, the `pause` event makes the control settle (a late `listen:stop` with reason `stopped` fires on the detached button, which nobody hears) and the stale control is harmless; `stopActive` is cleared by that settle or overwritten by the next control. |
| E8 | `videoPanel` or `listenControl` resolves after the container left the page | the nodes are appended to the detached container and garbage-collected with it; consumers use the `alive` guard of 4.4 to destroy early. |
| E9 | `videoPanel` called twice for one video in one container | returns the existing element. |
| E10 | `listenControl` called twice with one id | not guarded (the caller owns ids): destroy the first, then create the second (what the Walk does per stop). |
| E11 | A `SITE_AUDIO` key with `clips: []` (the writer emits it before the audio run) | `listenControl` resolves `null`. |
| E12 | `segment` names a clip that does not exist | `null`. |
| E13 | Theme switched while the panel is open or a clip plays | nothing to redraw: all colour is inherited from tokens; playback continues. |
| E14 | Very long clip text or a one-word title | wraps (`overflow-wrap` is set on `body`); the transcript is a `p`. |
| E15 | No `CustomEvent`, `aspect-ratio` or `Promise`-returning `play()` | events are try/caught; the video falls back to its intrinsic size; a non-promise `play()` is treated as started. |
| E16 | A manifest entry with a script-looking `src` or `title` | all strings go through `textContent` and `setAttribute`; there is no `innerHTML`. |
| E17 | The page is served from a sub-path (GitHub Pages) | manifest paths are relative to `index.html`; the dynamic import is relative to `listen.js` (`../../media/manifest.js`); both resolve under any base. |
| E18 | A clip ends exactly when `play()` resolves (very short clip) | the chain advances on `ended`; the first clip's `listen:play` may be skipped in that race, the chain is not. |
| E19 | Playing a real mp4 or mp3 through `tools/smoke.mjs` | its static server serves them as `application/octet-stream` without `Range`; Chromium usually still plays them, but a script that depends on playback of real media should use its own server or `page.route`. Not needed by this goal. |

**Performance plan.** Importing `listen.js` costs nothing (no side effects). The manifest is one dynamic `import()` per page (an empty
manifest is about 200 bytes; with five videos and 51 clips it is under 12 KB), cached for the page's life. A video panel is 7 nodes
and a Listen control 3 (up to 5 with the transcript and the error line); both are built in well under 1 ms. No timer, no `requestAnimationFrame`,
no `window` or `document` listener. `audio` is `preload="none"` and has no `src` until the first click; `video` is `preload="metadata"`; one
`<audio>` per control is reused for the whole queue, and `settle` releases the connection (`removeAttribute('src')` then `load()`).

**Accessibility.** The Listen button has a constant accessible name and `aria-pressed`; the mark is `aria-hidden`; the transcript is text
(not a live region) and its content equals the spoken words, so the audio has a text equivalent; errors are `role="alert"`. The video
has captions as a default `<track>` when the manifest has them, native controls and keyboard, a labelled section and an `h2`, and a
summary that says whether it has a voice. Nothing autoplays. All text and borders meet 4.5 : 1 (3.1). The tap target is 44 px.

**Reduced motion.** There is no animation in this module and nothing autoplays, so `prefers-reduced-motion` needs no branch: the
student presses play. The state mark changes instantly. (The motion inside a video is the video's own and is user-started.)

**Phone layout (390 px).** The panel is the station column's width; the video is `width: 100%` at 16:9 (about 324 × 182); the heading
and summary wrap; the Listen button is at least 44 px tall and sits on its own line when the header's lede wraps; the transcript wraps and
never forces horizontal scroll (checked by `ov() <= 1` in step 2, 5 and 10 of the script at 390 px).

---

## 9. Out of scope, and requests for other owners

**Out of scope for this goal** (as in the plan): embedding panels or controls in stations (`i2-decisions-everywhere-*`, `i2-pictures`);
rendering any video (`i2-videos-*`); generating audio (the local agent, `docs/local-tasks.json`); the Walk bar itself (`i2-walk-shell`
imports `listen.js`). Also not done here: a hue-wheel or domain-colouring helper in `palette.py` (the 4D scene derives it from the
site's `domaincolor.js` rule), prefetching the next clip, resuming a narration from the middle, a volume or speed control, and a
transcript for videos beyond their captions.

**Requests for other owners** (none blocks this goal; the module is correct without them):

1. **`css/components.css` (owner `i2-walk-shell`, wave 1).** Optional polish for `.video-panel` and `.listen`; the module already works with
   the classes that exist today. Recommended block:
   ```css
   /* media: video panel and Listen control (js/core/listen.js) */
   .video-panel video { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: var(--radius-sm); background: var(--surface-2); }
   .video-panel .video-error { margin: var(--space-2) 0 0; }
   .listen[aria-pressed="true"] { border-color: var(--accent); }
   @supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
     .listen[aria-pressed="true"] { background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
   }
   .listen[data-state="error"] { border-color: var(--danger); }
   .listen-caption { margin: var(--space-2) 0 0; font-size: 0.95rem; }
   .listen-error { margin: var(--space-2) 0 0; color: var(--danger); font-size: 0.95rem; }
   ```
2. **`js/app.js` (owner `i2-walk-shell` in wave 1).** Call `loadManifest()` once at start (fire and forget) so the manifest promise is settled
   when a station mounts and the video panel appears in the same frame instead of shifting content a few milliseconds later.
3. **`tools/videos/render.mjs` (no owner this iteration; the orchestrator).** `mixMusic` re-muxes with `-c:v copy -c:a aac` and no
   `-movflags +faststart`, which leaves the `moov` atom at the end of the file; `preload="metadata"` on a host without `Range` support then downloads the whole video
   before it can show a duration. Add `-movflags +faststart` to that ffmpeg call (and to the copy of the manim output if manim did not already).
4. **`docs/ARCHITECTURE.md` (the integrator).** When 11.4 moves into section 3 as `3.17`: keep the six exports and the `Listen` object; add the ids and hooks this
   design introduces to section 9 "Listen control" and "Video panel": `#<id>-caption`, `#<id>-error`, `span.listen-mark`, `data-state`, `data-clip`,
   `#video-<id>-error`, `data-state` on the panel, and the events `listen:play` and `listen:stop`; record decision S1 (the both-addresses rule is for the five station files).
5. **`tools/interact-all.mjs` (owner `i2-decisions-kit`, wave 0).** The runner exits with "No routes listed for: ..." when a script in `tests/interact/` has no
   entry in its `ROUTES` table. Add `'i2-media-core': ['staircase']`. (The script is safe under that runner: it runs with `--no-shots`, and `ctx.shot` returns `null` then.)
6. **`js/registry.js` (the planner).** If the Walk should say both addresses aloud (S1), the change is in `walk.say`; then regenerate `walk.json` (5.8).

---

## 10. Builder notes (iteration 2, stage 3)

Built as designed: `js/core/listen.js` (six exports, no static import, no `data-for`), `videos/lib/palette.py` (13 tokens plus `mix` and `ramp`),
the five station narration files verbatim from 2.6, and `walk.json` generated from the registry with the command of 5.8. The unit file and the
interaction script follow section 7. Small differences, none visible to a consumer:

1. **U1 to U10 are ten top-level `test()` calls** (the design's "811 tests" count), each running its checks in order and naming the failing check in the message. This keeps the full suite at 811 tests with the same 9 red by design.
2. **U2 compiles `palette.py` from source** (`exec(compile(open(...).read(), ...))` under `python3 -B -I`) instead of `importlib.util.spec_from_file_location`. The importlib route writes `videos/lib/__pycache__/palette.*.pyc` and can read a stale one when an edit keeps the same size within one second; compiling from source does neither.
3. **`onAudioError` ignores an `error` event unless the control is active** (the design only ignored idle and destroyed). A late `error` event in the error state would otherwise replace the error line (for example the "would not start the sound" text) with the generic one.
4. The `title` default of `videoPanel` is written as the literal `'Watch (2–3 min)'` inside the signature (not through a constant), because `architecture-sync.test.mjs` compares parameter lists as text.
5. At the harness's dark view the script ignores 9 expected 404 lines rather than 8; the count is not pinned (S3).
