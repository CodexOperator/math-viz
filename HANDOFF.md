# Handoff: local agent

Two Claude Code agents work on this repo:

- **The cloud loop** (a claude.ai/code session) builds the study site with a 7-iteration
  multi-agent loop and pushes to `claude/compassionate-ptolemy-9g4oh4` after every iteration.
  At the end of each iteration it updates the **What to do locally** section below and
  `docs/local-tasks.json`.
- **The local agent** runs on the student's machine, where Doppler (project `agi`) and
  openrouter.ai are reachable. It checks the repo every hour and does whatever is waiting:
  making the OpenRouter audio calls work, generating ElevenLabs narration and Lyria music,
  re-rendering the manim videos with sound, and reporting back.

## Set up the hourly local agent (once)

```bash
git clone https://github.com/codexoperator/math-viz.git && cd math-viz
git checkout claude/compassionate-ptolemy-9g4oh4
bash tools/local/setup.sh --doppler-config <your-config> --run-now
```

`setup.sh` asks before it installs anything. It does five things:

1. Checks node, git, ffmpeg, doppler, claude and manim, and offers Homebrew installs for any that are missing.
2. Saves the Doppler project and config to `.local/dispatch.env`. That file is never committed.
3. Offers to create a long-lived Claude login token (`claude setup-token`) and store it in the
   macOS Keychain, so the unattended runs use your subscription. It also makes sure an
   `ANTHROPIC_API_KEY` is never billed by accident.
4. Installs a launchd job, `~/Library/LaunchAgents/com.mathviz.dispatch.plist`, that runs
   `tools/local/dispatch.sh` every hour. On Linux it adds a crontab entry instead.
5. Writes `.claude/settings.local.json`, a narrow allowlist, so `/local-dispatch` also runs
   without prompts in the desktop app or a terminal session.

Every hour, `dispatch.sh` runs `node tools/local/check.mjs`. That script pulls the branch and
lists pending work, without any AI. If nothing is pending, the tick ends there and costs
nothing. If there is work, it starts
`claude -p "/local-dispatch" --permission-mode dontAsk --allowedTools …` with a fixed
allowlist: git on this branch, the repo's own node scripts, `tools/local/run.sh` for the Doppler
commands, and ffmpeg/ffprobe. It logs to `.local/dispatch.log` and shows a desktop notification
when it finishes.

Handy commands:

```bash
node tools/local/check.mjs              # what is pending, without starting Claude
bash tools/local/dispatch.sh --force    # run one tick now
tail -f .local/dispatch.log             # watch it
bash tools/local/setup.sh --uninstall   # stop the schedule
```

The launchd job runs while you are logged in and the Mac is awake. A tick missed during sleep
runs when the Mac wakes.

### Alternatives to launchd

- **Claude desktop app:** Code tab → Routines → New routine → **Local**. Folder: this repo.
  Schedule: Hourly. Instructions: `Run /local-dispatch`. Run `setup.sh` first so the allowlist in
  `.claude/settings.local.json` exists, then use **Run now** once and choose "always allow" for
  anything it still asks. The app must stay open and the computer awake (Settings → This
  computer → Keep computer awake). This starts Claude every hour even when nothing is pending, but
  an idle tick is one short turn.
- **A terminal session:** `claude`, then `/loop 1h /local-dispatch`, then `/bg` to keep it running
  without the terminal. These loops expire after 7 days, so recreate it weekly.

## What to do locally

<!-- local-tasks:start -->
_Updated 2026-10-15 by the cloud loop. Cloud status: iteration 1 of 7, running._

Iteration 1 is planning the first full version of the site. No stations, videos or narration exist yet.

### ☐ L1-setup — Check the local toolchain
Every later task needs node, git push access, ffmpeg and manim; Doppler for audio.

1. Run `node tools/local/check.mjs --tools` and read the tool report.
2. If anything is missing, do not try to install it from an unattended run (Homebrew needs the student). Record the task as blocked with needs_from_student: "Run `bash tools/local/setup.sh` and accept the install for <missing tools>."
3. Confirm pushing works: `git push --dry-run origin <branch>`.

Done when:
- `node tools/local/check.mjs --tools` reports node, git, npm, ffmpeg, doppler, claude and manim as ok
- `git push --dry-run` succeeds

### ☐ L2-audio-api — Make the OpenRouter audio calls work (ElevenLabs speech, Lyria music)
Needs: doppler, network.
tools/media/generate-audio.mjs was written in the cloud without access to openrouter.ai, so its audio requests are untested.

1. List secret names (never values): `bash tools/local/run.sh secret-names`. If the provisioning (admin) key has a name the script does not look for, set "keyVar" in media/audio-config.json.
2. List audio-capable models: `bash tools/local/run.sh audio --list-models`. Pick the ElevenLabs speech model and the Google Lyria music model.
3. Read OpenRouter's current documentation (WebFetch on openrouter.ai/docs) for requesting audio output from those models, and fix openrouterAudio() in tools/media/generate-audio.mjs so the documented request shape is tried first.
4. Test in a scratch folder so nothing in media/ changes: create .local/audio-test/site/test.json with one short speech segment and a music prompt of 20 seconds, then `bash tools/local/run.sh audio --narration-dir .local/audio-test --audio-dir .local/audio-test/out --tts-model <id> --music-model <id>`. Check both files with ffprobe (non-zero duration, audio stream present).
5. Save the choices in media/audio-config.json: voice (warm, clear, unhurried; suited to explaining maths the night before a test), ttsModel, musicModel, limitUsd 5. Commit tools/media and media/audio-config.json.

Done when:
- one speech clip and one music clip were generated through OpenRouter and are valid audio
- media/audio-config.json records the voice and both models
- the temporary OpenRouter key was deleted (the script prints 'Deleted the temporary OpenRouter key.')

Always, on every tick: if narration text changed or a video was rendered without its audio, run the media step (`auto-media`).
<!-- local-tasks:end -->

## How the local agent works

The procedure for each tick is in `.claude/skills/local-dispatch/SKILL.md`. In short:

- **Work queue:** `docs/local-tasks.json`, written by the cloud. Each task has steps and
  "done when" checks.
- **Automatic task `auto-media`:** whenever narration text has no up-to-date audio, or a video
  was rendered without its audio, it runs `bash tools/local/run.sh media`. That script runs
  `doppler run … -- npm run media` to generate the audio, re-render the videos so the animation
  follows the real narration, and update `media/manifest.js`.
- **Progress log:** `docs/local-done.json`, written by the local agent, with one entry per task:
  done, or blocked along with what it needs from the student.
- **Feedback to the cloud loop:** `docs/review/local-notes.md`. The cloud orchestrator reads it
  before every iteration and passes it to the agent that plans the next round.
- **Ownership:** the local agent edits only `media/audio/**`, `media/audio-config.json`,
  `tools/media/**`, `tools/local/**`, `docs/local-done.json` and `docs/review/local-notes.md`.
  It also regenerates `media/video/**` and `media/manifest.js` with the tools. Everything else
  belongs to the cloud loop.
- **Secrets:** values are never printed, logged or committed, and only secret names are ever
  listed. The audio script creates a temporary OpenRouter inference key from your provisioning
  key, capped at $5, and deletes it afterwards. The agent does at most 3 audio runs per 24 hours.

## If the cloud session is gone

When the cloud loop has finished and you want more iterations, run the loop locally: open
`claude` in this repo and type `/study-session resume`. The latest state is in
`docs/goals/iter-*.json`, `docs/review/iter-*-orchestrator.md` and the commit log.
