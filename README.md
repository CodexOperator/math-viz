# One Point, Two Addresses

An interactive study map for **MAT 412 Test 1** (complex numbers, Chapters 1–3). Every review
problem is a place in one visual story: a point has a Cartesian address (where it sits) and a
polar address (how to get there by turning and walking), and almost every test question comes
down to choosing the address that makes it easy. The story itself is in [`docs/STORY.md`](docs/STORY.md).

It is a static site: plain HTML, CSS and JavaScript modules, no build step, no network access
at runtime (three.js and KaTeX are vendored under `vendor/`).

## View it on your machine

You need [Node.js](https://nodejs.org) 18+ (or Python 3) and git.

```bash
git clone https://github.com/codexoperator/math-viz.git
cd math-viz
git checkout claude/compassionate-ptolemy-9g4oh4   # the branch the build loop pushes to
npx http-server -c-1 -p 8080 .                      # or: python3 -m http.server 8080
```

Open <http://localhost:8080>. The page has to be served over http; opening `index.html`
directly from disk (`file://`) blocks the JavaScript modules.

To get the newest version after each build-loop iteration: `git pull`.

## Run the checks

```bash
npm test                      # unit tests for the maths (node:test, no install needed)
node tools/smoke.mjs          # loads every station in headless Chromium, desktop + phone
node tools/smoke.mjs --route lab --dark   # one station, also in dark mode
```

The smoke test needs Playwright (`npm i -g playwright && npx playwright install chromium`).
Screenshots land in `docs/review/shots/`.

## Videos (manim)

Rendered explainer videos live in `media/video/` and play inside the stations, with captions
from the narration script. They are committed, so you only need manim to re-render them.

To render on macOS:

```bash
brew install pango pkg-config ffmpeg
brew install --cask basictex          # LaTeX for the formulas; then open a new terminal
python3 -m venv ~/.venvs/manim && ~/.venvs/manim/bin/pip install manim
npm run videos                        # all videos; add -- --only <id> --quality l for a quick draft
```

On Linux, install `libpango1.0-dev pkg-config ffmpeg texlive-latex-extra dvisvgm` with apt
instead. The renderer finds manim in `$MANIM`, `~/.venvs/manim/bin/manim`, or on your PATH.

## Narration and music (ElevenLabs voice, Lyria music, via OpenRouter + Doppler)

Audio is generated on your machine because it needs your keys. One command:

```bash
brew install dopplerhq/cli/doppler    # if the Doppler CLI is not installed yet
doppler configs --project agi          # find your config name (dev, prd, ...)
doppler run --project agi --config <config> -- npm run media
```

What it does:

1. Reads the narration scripts in `media/narration/videos/*.json` and `media/narration/site/*.json`.
2. Uses your OpenRouter provisioning (admin) key to create a temporary inference key capped at
   $5 (`--limit-usd` to change), and deletes that key when it finishes. It looks for the key in
   `OPENROUTER_PROVISIONING_KEY`, `OPENROUTER_ADMIN_KEY`, `OPENROUTER_ADMIN_KEY_2`, `ADMIN_KEY`,
   `ADMIN_KEY_2`, or any variable named like `OPENROUTER_*ADMIN*`. If your secret has another
   name, add `-- --key-var YOUR_SECRET_NAME`. Only variable names are printed, never values.
3. Generates one clip per narration segment with an ElevenLabs voice and a music bed per video
   with Google Lyria (models are picked from OpenRouter's model list; see them with
   `npm run media:audio -- --list-models`, override with `--tts-model` / `--music-model`).
4. Re-renders the videos so the animation timing follows the real narration, mixes the music
   underneath, and updates `media/manifest.js` so the site shows the Listen controls.

Only clips whose text changed are regenerated. Use `npm run media:audio -- --dry-run` to see the
work list without spending anything. If `ELEVENLABS_API_KEY` is set, speech goes straight to
ElevenLabs instead of OpenRouter.

The OpenRouter audio calls could not be tested from the cloud session that wrote this script,
because openrouter.ai was blocked there. If a call fails, the script prints the server's error
message; paste it into Claude Code locally and it can adjust the request in
`tools/media/generate-audio.mjs`.

## How this was built: the study loop

The site was built by a multi-agent loop you can reuse for your next test:

1. **Unifier (Fable)** looks for the threads that tie every explanation together and writes `docs/STORY.md`.
2. **Goal planner (Fable)** splits the work into verifiable goals (`docs/goal-schema.json`, `docs/goals/`).
3. **Designer (Sonnet)** writes a detailed design with pseudocode per goal (`docs/designs/`).
4. **Builder (Sonnet)** implements it, with unit tests and interaction scripts.
5. **Review A (Sonnet)** checks the build against the design; **Review B (Sonnet)** checks it against the goal.
6. **Integrator and auditor (Sonnet)** clear leftover issues, then the orchestrating Claude
   checks everything against the handouts (`docs/review/iter-*-orchestrator.md`) and the loop
   starts again.

The loop is saved in this repo:

- `.claude/workflows/study-build-loop.js`: the workflow (one step per run: plan, execute or integrate).
- `.claude/skills/study-session/SKILL.md`: how the orchestrator drives it across iterations.

For a new test, copy this repo (or use it as a template), open Claude Code in it, attach your
handouts and type `/study-session`. See [`docs/PIPELINE.md`](docs/PIPELINE.md) for details.

### Continue a cloud session on your machine

From a clone of this repo, signed in to the same claude.ai account, with no uncommitted
changes: `claude --teleport` (pick the session) or `claude --teleport <session-id>`. Your
terminal gets its own copy of the conversation and checks out the branch. Background workflows
still running in the cloud stay in the cloud session.

## Repo layout

```
index.html, css/, js/          the site (js/registry.js lists the stations)
vendor/                        three.js r160, KaTeX 0.16 (fonts inlined)
videos/scenes, videos/lib      manim scenes and the narration-timing helper
media/                         narration scripts, generated audio, rendered videos, manifest.js
tools/smoke.mjs                headless smoke test
tools/videos/render.mjs        renders videos and writes media/manifest.js
tools/media/generate-audio.mjs narration + music via OpenRouter (run under Doppler)
tests/unit, tests/interact     unit tests and interaction scripts
docs/                          assignment, story, architecture, goals, designs, reviews
```
