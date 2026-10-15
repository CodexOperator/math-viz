# Handoff: local agent

You are a Claude Code agent running on the student's own machine. A separate Claude Code
session in the cloud is building this study site with a 7-iteration multi-agent loop and pushes
to the branch `claude/compassionate-ptolemy-9g4oh4` after every iteration. You have something
the cloud session lacks: **Doppler** (project `agi`) and network access to **openrouter.ai**.

Read `README.md` for what the site is and how to run it, and `docs/STORY.md` for the story it
tells. You do not need to read the rest of `docs/` unless a task below points you there.

## Your job, in order

### 1. Get set up

```bash
git fetch origin && git checkout claude/compassionate-ptolemy-9g4oh4 && git pull
npm test                                   # should pass
npx http-server -c-1 -p 8080 .             # look at http://localhost:8080, then stop it
doppler configs --project agi              # pick the config that holds the OpenRouter keys
```

Ask the student which Doppler config to use if it is not obvious. In the commands below,
`$CFG` stands for that config's name.

### 2. Make the audio script work against the real OpenRouter API

`tools/media/generate-audio.mjs` was written in the cloud without network access to
openrouter.ai, so its audio calls are **untested**. The student says their OpenRouter
"admin key" and "admin key 2" in Doppler are provisioning keys that can be used to generate
speech with ElevenLabs and music with Google Lyria.

1. `doppler secrets --project agi --config $CFG --only-names` to see the secret names. Never
   print values. If the provisioning key has a name the script doesn't look for, save it as
   `"keyVar"` in `media/audio-config.json`.
2. `doppler run --project agi --config $CFG -- npm run media:audio -- --list-models` to list the
   models that can output audio. Pick the ElevenLabs speech model and the Lyria music model.
3. Check OpenRouter's current docs for how to request audio output from those models (the script
   tries `/audio/speech`, then `/chat/completions` with `modalities: ["audio"]`, then streaming).
   Fix `openrouterAudio()` so it uses the documented request shape first.
4. Test small: make a scratch narration file outside the repo's `media/` folders, or run
   `--only <one id>` once real narration exists. Listen to the result.
5. Pick a voice: warm, clear, unhurried, suited to explaining maths the night before a test. Save
   your choices so every run sounds the same, in `media/audio-config.json`:
   `{ "voice": "...", "ttsModel": "...", "musicModel": "...", "limitUsd": 5 }`.
   Music beds are quiet and instrumental, with no vocals and no strong beat, so they sit under
   the speech.

Security rules (not negotiable):
- Never print, log, commit, or write a secret value to any file. Pass secrets only through
  `doppler run`.
- The script creates a temporary inference key with a spending cap and deletes it at the end.
  Keep it that way. If a run crashes before deleting it, delete the key named "math-viz media …"
  in the OpenRouter dashboard, or tell the student.
- Before spending more than about $5 in total, ask the student.

### 3. Generate the audio and render the videos

Narration scripts appear as the cloud loop adds videos and narrated stations:
`media/narration/videos/<id>.json` and `media/narration/site/<station>.json`. If there are none
yet, the cloud loop has not reached that point; pull again later (videos are planned from
iteration 2).

```bash
# install manim once (macOS); the README has the Linux version
brew install pango pkg-config ffmpeg && brew install --cask basictex
python3 -m venv ~/.venvs/manim && ~/.venvs/manim/bin/pip install manim

doppler run --project agi --config $CFG -- npm run media      # audio for changed text, then re-render
```

`npm run media` only regenerates clips whose text changed, re-renders the videos so the
animation timing follows the real narration, mixes the music in, and rewrites
`media/manifest.js`. Check the result:
- Watch every video in `media/video/` start to finish: voice in sync with the animation, music
  audible but well under the voice, no clipped words, no long silences.
- In the site, each station with a video plays it with sound and captions. Stations with narration
  show a Listen control that plays the clips.
- `node tools/smoke.mjs` still passes.

### 4. Commit and push, without colliding with the cloud loop

The cloud session commits to the same branch. To stay out of each other's way:

| You own (edit freely) | The cloud loop owns (do not edit) |
|---|---|
| `media/audio/**`, `media/audio-config.json` | `index.html`, `css/`, `js/`, `tests/`, `docs/` (except the notes file below) |
| `media/video/**`, `media/manifest.js`: shared; both sides regenerate them with the tools | `media/narration/**` (the scripts; send wording changes as notes) |
| `tools/media/**` | `videos/scenes/**`, `videos/lib/**`, `tools/videos/**` (send fixes as notes, unless a renderer bug blocks you) |
| `docs/review/local-notes.md` | `.claude/` |

```bash
git add media/audio media/audio-config.json media/video media/manifest.js tools/media docs/review/local-notes.md
git commit -m "Narration and music for <ids>"
git pull --rebase origin claude/compassionate-ptolemy-9g4oh4
# if media/manifest.js or a video conflicts: take either side, re-run `npm run videos -- --only <id>`
# (or `-- --manifest-only` for just the manifest), `git add` the result, and continue the rebase
git push origin claude/compassionate-ptolemy-9g4oh4
```

Keep every video under 15 MB (the site is also published as a claude.ai Artifact, which caps
file size). Render at the default 720p.

### 5. Talk back to the cloud loop

Write anything the cloud session should act on in `docs/review/local-notes.md`: narration lines
that sound wrong aloud, scenes whose pacing is off, renderer bugs, things in the site that look
broken on a real screen, and what the student said while using it. Date each entry. The cloud
orchestrator reads this file before every iteration and passes it on to the agent that plans the
next round of improvements.

### 6. Repeat after each cloud iteration

Each push from the cloud may add new narration. `git pull`, then
`doppler run --project agi --config $CFG -- npm run media`, check, commit, push.

## If the cloud session is gone

If the cloud session has finished or died and the student wants more iterations, you can run
the whole loop locally: type `/study-session` and say "resume". The latest state is in
`docs/goals/iter-*.json`, `docs/review/iter-*-orchestrator.md` and the commit log. Continue at
the next iteration number. The skill in `.claude/skills/study-session/SKILL.md` explains each step.

## State at handoff (2026-10-15)

- Scaffolding, the saved pipeline, and the video and audio tooling are committed.
- Iteration 1 of 7 is running in the cloud. The story is written (`docs/STORY.md`) and the Fable
  planner is splitting the first version into goals. The site has no stations yet.
- No narration scripts or videos exist yet. They are expected from iteration 2 onward.
- manim and the narration-timing helper were tested in the cloud, including a narrated render
  with stand-in audio and a music mix. The OpenRouter calls are the untested part.
