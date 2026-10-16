# Cloud handoff: resume the study loop in a fresh session

Read this first when you are the orchestrating Claude for the math-viz study site and your
context is fresh (after `/clear`, or a new claude.ai/code session on branch
`claude/compassionate-ptolemy-9g4oh4`). It says where the 7-iteration loop stands, what to do
next, and the hard-won facts the previous session learned. `HANDOFF.md` is the separate handoff
for the **local** agent on the student's machines.

<!-- loop-state:start -->
## Where the loop stands (2026-10-16)

- **Iteration 1 of 7: finished and published** (commit 6fab4a9). 21 stations, the Mapping Lab,
  the 4D graph and the problem index, all 29 review problems wired. Review:
  `docs/review/iter-1-orchestrator.md`.
- **Iteration 2 of 7: wave 0 and wave 1 built; integrate is next.**
  - Plan: `docs/goals/iter-2.json` (14 goals), story: `docs/STORY.md` (rewritten this iteration:
    "a complex number is a move", the two decisions *Names* and *address*, "up close it is one move").
  - Wave 0 (decisions-kit, generators, media-core): passed. Residue: `docs/review/iter-2/residue/wave0.json`.
  - Wave 1 (walk-shell, rehearse, lab-diary, pictures, home-index-deck, decisions-everywhere-a/-b/-c,
    videos-ch1/-ch2/-4d): **stopped mid-run on 2026-10-16 at the student's request (out of usage).**
    The six execute runs were killed; their partial work is committed as WIP snapshots (last:
    the commit that added this line). No wave-1 goal has a recorded review verdict, so there is no
    `wave1.json`. To resume: per goal, read `docs/designs/iter-2/<id>.md` and the review folders
    under `docs/review/iter-2/<id>/` to see how far it got, then re-run execute for the wave-1
    goals (2 per run, several runs in parallel); designers will find their designs already
    written. The loop is **paused** after this: the student asked to finish iteration 2's residue
    and integrate, then go idle rather than continue to iterations 3-7, unless they ask again.
  - The taste skill was adopted mid-iteration (see "Design taste" in `docs/CONSTRAINTS.md`): in
    iteration 2 its findings are minor unless they hurt reading; the integrator fixes them.
- **Local agent:** linux-box runs the hourly tick (systemd). L1, L2, L3, L5, L6 are done. auto-media
  (51 site narration clips) was blocked because the dispatch skill called `doppler run` directly;
  fixed in 483e992 (it now uses `bash tools/local/run.sh media`), so the next tick should generate
  the audio. Read `docs/review/local-notes.md` and `docs/local-done.json` before each iteration.
<!-- loop-state:end -->

## What to do next, in order

Follow `.claude/skills/study-session/SKILL.md` (the general procedure). The concrete steps from here:

1. **Pull first.** `git pull --rebase --autostash origin claude/compassionate-ptolemy-9g4oh4`. The
   local agent pushes lease and audio commits; always pull with `--rebase --autostash` before a push.
2. **Finish iteration 2.**
   1. Check the tree: `npm test` and `node tools/interact-all.mjs --jobs 2`. Expect a few failures
      that the residue already names.
   2. **Residue cleanup.** Merge `docs/review/iter-2/residue/wave0.json` and `wave1.json`, plus any
      goal whose status is not `passed`. If there are more than ~30 items, do what iteration 1 did:
      group them by the files they touch (core modules, stations in pairs, docs), write each group to
      `docs/review/iter-2/residue/<group>.json`, and run one Sonnet agent per group in parallel with
      exclusive file ownership (examples: `docs/review/iter-1/residue/*.json` and `*-report.md`).
   3. **Integrate.** `Workflow({ name: 'study-build-loop', args: { mode: 'integrate', iteration: 2, residue: <what is left> } })`.
      The integrator also runs the taste checks on home and every changed route.
   4. **Videos.** Five scenes exist (`videos/scenes/*.py`, narration in `media/narration/videos/`).
      `npm run videos` renders silent, captioned mp4 + vtt and regenerates `media/manifest.js`
      (final quality 720p). Look at extracted stills (`ffmpeg -ss <t> -i media/video/<id>.mp4 -frames:v 1 ...`).
   5. **Orchestrator check against `docs/ASSIGNMENT.md`** (not the goals). Write
      `docs/review/iter-2-orchestrator.md` in the same shape as iteration 1's. Include the taste
      inspector's FAIL/WARN counts for home and two stations (iteration 1 baseline: home 8 FAIL /
      7 WARN, staircase 9 FAIL / 7 WARN).
   6. **Hand off local work.** Update `docs/local-tasks.json` (`cloud` block: iteration 2 finished,
      summary; new tasks such as "watch the five videos with sound and report pacing", "try the Lab
      diary with a trackpad"; bump `rev` on changed tasks), then `node tools/local/sync-handoff.mjs`.
   7. **Ship.** Commit with a message that does **not** start with `WIP` and push. Then publish (below).
3. **Iterations 3 to 7.** For each k: plan
   (`Workflow({ name: 'study-build-loop', args: { mode: 'plan', iteration: k, total: 7, notes: <text of iter-(k-1)-orchestrator.md + local notes>, residue: [] } })`),
   execute wave by wave, integrate, check, hand off, ship. From iteration 3 a taste FAIL outside
   the exemptions is a major review issue.
4. **Final delivery** after iteration 7: publish everywhere, summarise for the student.

## How to run the workflow well (learned the hard way)

- **Concurrency is 2 agents per workflow run** on this 4-CPU container. Parallelism comes from
  launching several `execute` runs at once, one per slice of 1-2 goals, all in one message.
- **Pass goals as stubs** `{ id, owns }` in execute mode; each agent reads the full spec from
  `docs/goals/iter-K.json`. This keeps the workflow args small.
- **Exclusive file ownership per wave.** Each goal auto-owns `docs/designs/iter-K/<id>.md`,
  `tests/unit/<id>.test.mjs` and `tests/interact/<id>.mjs`.
- **The stop button kills running agents.** If a run dies, relaunch with
  `{ scriptPath, resumeFromRunId }`; finished agents return cached results.
- **Commit work in progress with a `WIP` prefix** (Pages skips those). The stop hook wants a clean
  tree at the end of each turn.
- Fable for structure (the Unifier and the planner), Sonnet for design, build and review. That is
  the student's explicit request.

## Tools and tests

- `npm test` runs `node --test "tests/unit/*.test.mjs"` (the glob matters on Node 22).
- `node tools/smoke.mjs [--route a,b] [--script f.mjs] [--dark] [--out DIR]` runs Playwright with
  software WebGL and Google Fonts blocked.
- `node tools/interact-all.mjs [--jobs N] [filter]` runs every interaction script on its routes.
  A script names its routes in its header.
- `bash tools/taste.sh lint <files>` and `bash tools/taste.sh inspect <route>` run the taste skill.
  Screenshots are in `.taste-skill/inspect/<route>/`.
- `tests/unit/architecture-sync.test.mjs` keeps `docs/ARCHITECTURE.md` true to the code.
- **If this is a fresh container**, manim and LaTeX may be missing:
  `apt-get install -y libpango1.0-dev pkg-config ffmpeg texlive-latex-extra dvisvgm`, then
  `python3 -m venv /root/.venvs/manim && /root/.venvs/manim/bin/pip install manim`. Chromium for
  Playwright is pre-installed (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). The CDN is blocked
  (403); vendor from npm instead (three.js r160 and KaTeX are already in `vendor/`).

## Publishing (end of every iteration, after a non-WIP push)

All targets and ids are in `docs/publish.json`; update its `history` each time.

- **GitHub Pages:** the push triggers `.github/workflows/pages.yml` (tests, then build-site, then
  gh-pages). Check it with the GitHub MCP `actions_list`. Live at https://codexoperator.github.io/math-viz/.
- **claude.ai Artifact** https://claude.ai/artifact/PnYWqq86SuYe9m2MKQxYn2:
  `node tools/publish/build-site.mjs`, then
  `node tools/publish/artifact-page.mjs build/site/index.html <scratchpad>/artifact/index.html`.
  From a new session, `Artifact` read that url first, then publish with `url` set and every file
  under `build/site` passed in `files`.
- **Google Drive** folder `1xSpARrjrV73KjFhuIwUj_aWmFNbnOiud`: create a new "Start here" doc
  (`create_file`, `contentMimeType: text/html`, `parentId`), trash the old one (`start_doc_id`), and
  update `docs/publish.json`. The Docs API is denied, so recreate the doc rather than editing it.

## Facts the student has confirmed (never re-litigate)

- **ElevenLabs is on OpenRouter.** OpenRouter's plain `/models` hides non-text models; use
  `?output_modalities=all`. Narration uses `elevenlabs/eleven-v4`, voice `george`
  (`media/audio-config.json`). Music is Google Lyria via OpenRouter.
- The secrets are in Doppler project `agi`, config `dev`; the provisioning key is `OPENROUTER_ADMIN`.
  Audio is generated **locally** (the cloud cannot reach openrouter.ai). Secret values are never
  printed, logged or committed. Each run uses a temporary key capped at $5, deleted afterwards, and
  there are at most 10 audio runs per 24 hours.
- Never use bypassPermissions on the student's machines. The local agent runs in dontAsk mode with
  an allowlist (`tools/local/dispatch.sh`, `.claude/settings.local.json`).
- The goal is that the test questions feel less daunting: each problem is a point on one visual
  story the student revisits, not a procedure. The student asked for 7 iterations, each looking
  for the threads that unify everything (moving between polar and Cartesian at will; arg (a set)
  vs Arg vs the point). They also asked for live input/output brush strokes with time, a "Tom
  Riddle's diary" drawing Lab with several views, a 4D graph comprehension tool, and manim
  videos with ElevenLabs narration and Lyria music. They also asked for the taste skill in every
  build and review. Their words are in `docs/ASSIGNMENT.md` section 1.

## Prompt for a fresh session

> You are the orchestrator of the math-viz study loop. Read docs/CLOUD-HANDOFF.md, then
> .claude/skills/study-session/SKILL.md, and continue from "What to do next". Work autonomously
> through iterations 2 to 7 without asking me questions unless something is truly the student's
> decision; commit WIP regularly and publish at the end of each iteration.
