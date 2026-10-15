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

### Option A: Claude desktop app routine (recommended)

1. In a terminal, from the repo:

   ```bash
   cd math-viz
   git checkout claude/compassionate-ptolemy-9g4oh4 && git pull
   bash tools/local/setup.sh --desktop
   ```

   It shows the configs in Doppler project `agi` and asks which one holds the OpenRouter keys.
   Type the name, for example `dev`. It also offers to install anything missing (ffmpeg,
   manim) and writes two local-only files: `.local/dispatch.env` and the command allowlist
   `.claude/settings.local.json`.
2. In the Claude desktop app: **Code** tab → **Routines** → **New routine** → **Local**.
   - Name: `math-viz local agent`
   - Folder: this repo
   - Schedule: **Hourly**
   - Instructions: `Run /local-dispatch`
   - Permission mode: **Accept edits**
3. Press **Run now** once and watch it. If it asks to approve a command, choose "always allow",
   so later unattended runs don't stall on the same question.
4. Keep the app open and the computer awake (Settings → This computer → Keep computer awake).
   A run missed while asleep catches up once on wake.

Each run starts with `node tools/local/check.mjs`, which pulls the branch and lists pending
work. When nothing is waiting, the run ends after that one short step.

### Option B: launchd (no app needed)

`bash tools/local/setup.sh --doppler-config dev --run-now` (use your config's name, with no
angle brackets). It installs `~/Library/LaunchAgents/com.mathviz.dispatch.plist`, which runs
`tools/local/dispatch.sh` hourly. That script does the git check first and starts
`claude -p "/local-dispatch"` with a fixed allowlist only when there is work. It offers to
store a `claude setup-token` login in the Keychain so the runs use your subscription.
The log is in `.local/dispatch.log`; `bash tools/local/setup.sh --uninstall` removes the job.

### A Linux box (systemd), alone or alongside the Mac

Any number of machines can run the local agent. When one finds work, it takes a lease
(`docs/local-lease.json`, claimed with a git push) and the others skip that hour. Toolchain setup
(`L1-setup`) is done once on every machine.

On the Linux box (Debian or Ubuntu; the script asks before every install):

```bash
git clone https://github.com/codexoperator/math-viz.git ~/math-viz && cd ~/math-viz
git checkout claude/compassionate-ptolemy-9g4oh4
doppler login                      # once, if this box has never used Doppler (opens a browser link)
bash tools/local/setup.sh --doppler-config dev --name linux-box
```

`setup.sh` does six things:

1. Offers to apt-install ffmpeg, pango, a LaTeX toolchain and python3-venv, and to install the
   Doppler CLI and manim (in `~/.venvs/manim`).
2. Checks that `git push` works. If it doesn't, set up GitHub access on this machine first, with
   `gh auth login` or an SSH key.
3. Saves `.local/dispatch.env`: the Doppler config, the machine name, and your current `PATH`, so
   the timer finds node and claude even if they came from nvm.
4. Offers to run `claude setup-token` and save the token to `~/.config/math-viz/claude-token`
   (mode 600) for unattended runs.
5. Installs and starts systemd user units in `~/.config/systemd/user/`:
   `math-viz-dispatch.service` (oneshot, runs `tools/local/dispatch.sh`) and
   `math-viz-dispatch.timer` (hourly, `Persistent=true`, a randomized 5-minute delay).
6. Turns on lingering (`loginctl enable-linger`), so the timer also runs when you are logged out.

Check it:

```bash
systemctl --user list-timers math-viz-dispatch.timer
systemctl --user start math-viz-dispatch.service      # run one tick now
journalctl --user -u math-viz-dispatch -n 50          # or: tail -f .local/dispatch.log
node tools/local/lease.mjs status                     # which machine is working, if any
```

Use `--cron` instead of systemd if you prefer, and `bash tools/local/setup.sh --uninstall` to remove it.

**To have a Claude Code agent on the Linux box do the setup**, start `claude` in `~/math-viz`
(or anywhere, if it isn't cloned yet) and paste:

> Set this machine up as a second local agent for the math-viz study site. If it is not cloned
> yet, clone https://github.com/codexoperator/math-viz.git into ~/math-viz and check out
> claude/compassionate-ptolemy-9g4oh4. Read HANDOFF.md, especially "A Linux box (systemd)". Then
> run `bash tools/local/setup.sh --doppler-config dev --name linux-box`. It cannot ask you
> questions without a terminal, so its install prompts will be skipped. Afterwards run
> `node tools/local/check.mjs --tools` and make every missing tool work. For anything that needs
> sudo, a password or a browser login (apt installs, the Doppler CLI install, `doppler login`,
> `gh auth login`, `claude setup-token`, `sudo loginctl enable-linger`), stop and give me the exact
> command to paste, then continue once I say it's done. Verify that `git push --dry-run` works,
> that `bash tools/local/run.sh secret-names` lists names (never print values), and that
> `systemctl --user list-timers` shows math-viz-dispatch.timer. Finally run one tick with
> `systemctl --user start math-viz-dispatch.service` and show me the end of `.local/dispatch.log`.

### Option C: a terminal session

`claude`, then `/loop 1h /local-dispatch`, then `/bg` to keep it running without the terminal.
These loops expire after 7 days.

### Handy commands

```bash
node tools/local/check.mjs              # what is pending, without starting Claude
tail -f .local/dispatch.log             # launchd runs only
```

## Facts the student has confirmed (do not re-litigate)

- **ElevenLabs is on OpenRouter** (and discounted right now). OpenRouter's plain `/models`
  list hides models that do not output text; query with `?output_modalities=all` (the audio
  script does), or search openrouter.ai/models for "eleven". Narration uses ElevenLabs.
- The Doppler project is `agi`, config `dev`; the provisioning key is `OPENROUTER_ADMIN`.
- The student approved more ElevenLabs generation (2026-10-15). The local agent may run audio
  generation up to 10 times in 24 hours, each run capped at $5 on a temporary key.

## What to do locally

<!-- local-tasks:start -->
_Updated 2026-10-15 by the cloud loop. Cloud status: iteration 1 of 7, iteration 1 finished; iteration 2 planning next._

Iteration 1 is finished: 21 stations, the Mapping Lab, the 4D graph and the problem index, all 29 review problems wired to their stations. 801 unit tests and every interaction script pass. The site is live at https://codexoperator.github.io/math-viz/. Iteration 2 will add manim explainer videos and station narration scripts; their audio is yours to generate (task auto-media picks up new narration automatically).

### ☐ L6-real-browser — Check the site in a real browser with real fonts and GPU
The cloud checks the site in headless Chromium with software WebGL and with Google Fonts blocked, so fallback fonts are what it sees. The student's Mac loads the real fonts and uses the real GPU, which can change layout (wider text, wrapped labels) and 3D performance.

1. `git pull`, then `npm test` and `node tools/smoke.mjs --dark --out .local/real-shots` (smoke uses the local Chromium; fonts from Google load on this machine).
2. Look at the screenshots of home, addresses, staircase, lab, graph4d, roots and problems at desktop and phone width. Note any text that overflows, overlaps or wraps badly with the real fonts.
3. Open https://codexoperator.github.io/math-viz/ in the Mac's default browser (open command) only if this run is interactive; otherwise skip.
4. Write what you found in docs/review/local-notes.md (dated, with the route and a short description; attach nothing binary).

Done when:
- smoke ran locally with real fonts and the screenshots were reviewed
- findings (or 'nothing found') are recorded in docs/review/local-notes.md

Always, on every tick: if narration text changed or a video was rendered without its audio, run the media step (`auto-media`).

<details><summary>Finished tasks</summary>

- ☑ L1-setup — Check the local toolchain: Checked on linux-box: check.mjs --tools reports node (v24.22.0), git, npm, ffmpeg, doppler, claude and manim (~/.venvs/manim) ok; git push --dry-run succeeds.
- ☑ L3-pages — Turn on GitHub Pages for the gh-pages branch (one time): GitHub Pages was off (404). Enabled it with gh api POST for gh-pages, root. Pages status is built and https://codexoperator.github.io/math-viz/ answers HTTP 200.
- ☑ L5-elevenlabs — Switch narration to ElevenLabs through OpenRouter: ElevenLabs is listed (eleven-v4, v3, multilingual-v2 and others; all on POST /audio/speech with 21 named voices). Fixed generate-audio.mjs so the speech endpoint gets the bare text rather than the 'read this aloud' chat prompt, which a real TTS model would have spoken. Scratch test with elevenlabs/eleven-v4, voice george made two valid mono mp3 clips (8.8 s and 9.6 s, a natural pace for the text, including 'z equals minus one plus i root three'); temporary key deleted. audio-config.json now uses eleven-v4/george. No narration files exist yet, so nothing was regenerated. The agent could not listen to the clips; it checked durations and levels only.
- ☑ L2-audio-api — Make the OpenRouter audio calls work (ElevenLabs speech, Lyria music): OpenRouter lists no ElevenLabs model with audio output, so speech uses openai/gpt-audio-mini (voice sage) via streamed chat/completions (pcm16, the only shape OpenRouter accepts for audio), with a read-verbatim instruction; music uses google/lyria-3-clip-preview. Scratch test made a valid 11.5 s speech clip (transcript matched word for word) and a 15.3 s music clip; temporary key deleted each run.

</details>
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
  key, capped at $5, and deletes it afterwards. The agent does at most 10 audio runs per 24 hours.

## If the cloud session is gone

When the cloud loop has finished and you want more iterations, run the loop locally: open
`claude` in this repo and type `/study-session resume`. The latest state is in
`docs/goals/iter-*.json`, `docs/review/iter-*-orchestrator.md` and the commit log.
