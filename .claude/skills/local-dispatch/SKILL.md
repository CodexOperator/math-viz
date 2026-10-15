---
name: local-dispatch
description: One unattended tick of the local agent for the math-viz study site. Pulls the branch, finds pending local work (Doppler/OpenRouter audio, manim re-renders, toolchain setup, checks the cloud loop asked for), does it, records progress in docs/local-done.json, and pushes. Run hourly by tools/local/dispatch.sh, or by hand with /local-dispatch.
---

# Local dispatch (one tick)

You are the local agent described in `HANDOFF.md`. You usually run unattended, started by
`tools/local/dispatch.sh` once an hour, so nobody is there to answer questions. When you would
need to ask, record the task as blocked with the exact question or command for the student,
and move on.

## 1. Find the work

Run `node tools/local/check.mjs` (it pulls the branch first). Exit code 10 means nothing to do:
reply "Nothing to do." and stop. Otherwise it lists pending items, highest priority first. The full
instructions for each task id are in `docs/local-tasks.json`; read the task's `steps` and
`done_when`.

Load the local settings: `.local/dispatch.env` (written by `tools/local/setup.sh`) defines
`DOPPLER_PROJECT` and `DOPPLER_CONFIG`. Source it in each shell command that needs them, e.g.
`set -a; . .local/dispatch.env; set +a; doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- npm run media`.

## 2. Do each pending item

Work through the items in order. For each one:

- **dirty-tree**: uncommitted changes from an earlier tick. If they are finished work in files
  you own (table below), commit them; if half-done, finish the task they belong to; never discard
  files you did not create.
- **auto-media**: `doppler run ... -- npm run media`. Then check: every changed video plays start to
  finish with the voice in sync and music well under it (`ffprobe` durations, extract a few stills
  with `ffmpeg -ss <t> -i media/video/<id>.mp4 -frames:v 1 /tmp/<id>-<t>.png` and look at them),
  every file under 15 MB, `node tools/smoke.mjs` passes (needs Playwright; skip with a note if absent).
- **L…-tasks from docs/local-tasks.json**: follow `steps` and verify every `done_when`.

After each item, append an entry to `docs/local-done.json` → `entries`:
`{ "id", "rev", "status": "done" | "blocked", "at": "<ISO time>", "summary": "<one or two sentences>", "needs_from_student": "<exact ask, only when blocked>" }`.
(auto-media and dirty-tree get no entry; their result shows in the commit.)

## 3. Commit, pull, push

Stage only files you own, commit with a clear message, then
`git pull --rebase origin <branch>` and `git push origin <branch>`. If `media/manifest.js` or a
video conflicts during the rebase, take either side, regenerate it (`npm run videos -- --only <id>`
or `npm run videos -- --manifest-only`), `git add` it and continue. Never force-push.

| You own | The cloud loop owns (do not edit) |
|---|---|
| `media/audio/**`, `media/audio-config.json`, `tools/media/**`, `tools/local/**` | `index.html`, `css/`, `js/`, `tests/`, `.claude/`, `videos/**`, `tools/videos/**`, `tools/smoke.mjs` |
| `docs/local-done.json`, `docs/review/local-notes.md` | `docs/` everything else, including `docs/local-tasks.json` and `HANDOFF.md` |
| `media/video/**`, `media/manifest.js` (shared: regenerate with the tools, never hand-edit) | `media/narration/**` |

If something the cloud owns is broken (a scene fails to render, a page errors), do not fix it
here: describe it in `docs/review/local-notes.md` (newest first, dated, with the error text) so the
next cloud iteration fixes it.

## 4. Rules

- Secrets: never print, log, commit or write a secret value. Only `doppler run` passes them.
  Only ever list secret **names**.
- Spending: the audio script makes a temporary OpenRouter key capped by `limitUsd` (default 5) and
  deletes it. Do not raise the cap. Do at most 3 audio runs in 24 hours; if more seem needed, record
  a note and stop.
- If a run crashes before the temporary key is deleted, say so in local-notes so the student can
  delete keys named "math-viz media …" in the OpenRouter dashboard.
- Keep each tick short: if a single task needs more than about 45 minutes of work, stop at a clean
  point, commit what is done, and leave a note on what remains.
- End with a two-line summary: what you did, and anything the student needs to do.
