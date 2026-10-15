---
name: study-session
description: Turn test handouts (review problems, topic lists, definition sheets) into an interactive visual study map by running the multi-agent study-build-loop for several iterations. Use when the user shares material for an upcoming test and wants it visualized, or asks to run, resume or extend the study loop.
---

# Study session

Builds a static, interactive study site from a student's test handouts with the
`study-build-loop` workflow (`.claude/workflows/study-build-loop.js`). Each iteration runs five
stages: a goal planner (Fable) splits the work into verifiable goals using
`docs/goal-schema.json`; a designer writes a detailed design with pseudocode per goal; a
builder implements it; Review A checks the build against the design; Review B checks the
delivery against the goal. Then an integrator clears residue and you (the orchestrator) check
the whole site against the assignment before the next iteration asks Fable how to improve it.

The user opted into multi-agent orchestration by invoking this skill. Default to 7 iterations
unless the user names a number.

## 1. Intake (you, inline)

1. Read every handout the user attached (use the Read tool on PDFs, page by page).
2. Write `docs/ASSIGNMENT.md` with these sections, keeping problem text verbatim:
   1. Who it is for and what they asked for (quote the user's own words, then 3–4 success criteria).
   2. Review problems, each with a stable id (e.g. `1.4.2`, `P3`).
   3. Topics checklist with ids (`T1.1`, …).
   4. Definitions and theorems (the reference card).
   5. A seed for the unifying story.
   6. Non-goals.
3. Write `docs/THREADS.md`: 5–8 candidate unifying threads for this subject.
4. Adapt the "Design language" section of `docs/CONSTRAINTS.md` to the subject (keep the Stack,
   Process rules and Media track sections). Vendor any extra libraries under `vendor/` because
   the cloud container usually cannot reach CDNs (npm registry works: `npm install <pkg>` in the
   scratchpad, copy the dist files).
5. Check the harness: `npm test` and `node tools/smoke.mjs` (needs an index.html with `#view`).
   Optional: manim for videos (`~/.venvs/manim`, see README).
6. Commit the scaffolding.

## 2. Each iteration k = 1..N

Workflow concurrency is capped per run at (CPUs − 2), often just 2, so parallelism comes from
launching several `execute` runs at once.

1. **Plan.** `Workflow({ name: 'study-build-loop', args: { mode: 'plan', iteration: k, total: N, notes, residue } })`.
   `notes` is your previous orchestrator review (empty for k = 1); `residue` is anything left over.
   Read the returned `ideas`, `plan`, `waves` and `plan_problems`. Overwrite
   `docs/goals/iter-k.json` with the validated plan (the waves may have been bumped).
   Check `docs/STORY.md` and the plan yourself before building: every review problem must be
   covered in iteration 1, goals must have executable acceptance criteria, ownership must not
   collide. Fix small issues in the JSON directly; re-plan if it is badly off.
2. **Execute, wave by wave.** For wave w, split its goals into slices of size
   `max(1, CPUs − 2)` and launch one `Workflow({ name: 'study-build-loop', args: { mode: 'execute', iteration: k, goals: <slice of full goal objects> } })`
   per slice in a single message so they run concurrently. Wait for every notification before
   starting wave w + 1.
3. **Integrate.** Gather every `residue` entry from the execute results and run
   `Workflow({ name: 'study-build-loop', args: { mode: 'integrate', iteration: k, residue } })`.
4. **Orchestrator check (you).** First `git pull --rebase` to pick up commits from a local agent
   (see `HANDOFF.md`) and read `docs/review/local-notes.md`; fold anything new into your notes.
   Then check against `docs/ASSIGNMENT.md`, not against the goals:
   run `npm test` and `node tools/smoke.mjs --dark`; look at screenshots of the home/story map,
   the playground(s) and a sample of stations at desktop and phone width; walk the problem table
   in `docs/STORY.md` and confirm each review problem is reachable and its answer on screen is
   right (recompute it); judge whether the story thread is visible rather than a procedure.
   Write `docs/review/iter-k-orchestrator.md`: what works, what is broken, what still feels
   daunting, and specific asks for the next iteration. That file's text is the next `notes`.
5. **Media (if scenes exist).** `npm run videos` renders silent, captioned videos. Narration and
   music are generated on the user's machine (`npm run media` under Doppler; see README).
6. **Ship.** Commit (`git add -A`, clear message), push the session branch, and republish the
   artifact if one exists (see below). Tell the user in one or two lines what changed.

## 3. Publishing the site as a claude.ai Artifact (optional)

The Artifact page must not contain `<!doctype>`, `<html>`, `<head>` or `<body>`: build a
publish copy of `index.html` with those wrappers stripped (keep `<title>`, styles, scripts) in the
scratchpad, and publish it with every other runtime file (css/, js/, vendor/, media/) passed
through `files` with the same relative paths. Video files over 15 MB cannot be published.

## 4. Resuming

Workflow results are saved with the conversation. If a run died, relaunch it with
`{ scriptPath, resumeFromRunId }`; completed agents return cached results. Goals and designs
on disk (`docs/goals/`, `docs/designs/`) let a fresh session pick up where the last one stopped.
